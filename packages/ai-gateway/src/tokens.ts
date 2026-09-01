/**
 * Token counting for pre-flight decisions: does this prompt fit the window, and
 * what does it cost against the rate limiter. Actual billing always uses the
 * provider's reported counts, which arrive only after the call.
 *
 * This counts with a real BPE encoding (o200k_base, the GPT-4o family) rather
 * than a character heuristic. That is exact for OpenAI and close for the others:
 * Anthropic and Google do not publish a client-side tokenizer, and their
 * encodings are the same shape and within a few percent on the same text. The
 * remainder is covered by `providerMargin` below rather than by pretending the
 * number is exact.
 *
 * The character heuristic this replaced (`length / 4`) was not merely imprecise,
 * it was wrong in the dangerous direction on the content this product handles:
 * it undercounts Yoruba by ~2x and CJK/emoji by ~2.4x, so a prompt that was
 * measured as fitting the window was rejected by the provider instead.
 */
import { countTokens as encode } from "gpt-tokenizer/model/gpt-4o";

import type { ChatMessage } from "./providers";
import type { Provider } from "./models";

/**
 * Per-message framing the provider adds around the content: role, delimiters,
 * and the trailing primer that opens the assistant's turn. Four tokens per
 * message plus a small fixed tail is the long-standing figure for the chat
 * formats, and being a little over is free where being under is a rejection.
 */
const PER_MESSAGE_OVERHEAD = 4;
const PER_REQUEST_OVERHEAD = 3;

/**
 * How far the count above might be under the truth for a given provider.
 *
 * OpenAI is measured with its own encoding, so it needs only enough slack to
 * cover framing we did not model. Anthropic and Google are counted with a
 * foreign tokenizer and get real headroom. This is applied to the window check,
 * where being wrong low costs the request and being wrong high costs a slightly
 * smaller usable window.
 */
const PROVIDER_MARGIN: Readonly<Record<Provider, number>> = {
  openai: 1.02,
  anthropic: 1.15,
  google: 1.15,
  local: 1.15,
};

export function providerMargin(provider: Provider): number {
  return PROVIDER_MARGIN[provider] ?? 1.15;
}

/**
 * Tokens in a single string.
 *
 * A tokenizer failure must never take down a request that would otherwise
 * succeed, so a throw falls back to the old heuristic. That path is strictly
 * worse, and it is better than a 500.
 */
/**
 * Longest slice handed to the encoder at once.
 *
 * BPE merging is superlinear in the length of a single unbroken run, and the
 * regex that splits text into words does not help when there are no boundaries
 * to split on. Measured on this encoder: 8k identical characters take 25ms and
 * 32k take 441ms, so a pasted 760KB document would hang the request outright.
 * Slicing bounds that cost. A token straddling a slice boundary is counted
 * twice, which overcounts by at most one token per slice, in the safe
 * direction.
 */
const CHUNK_CHARS = 2_048;

/**
 * How many slices are counted exactly before switching to extrapolation. This
 * caps the work at roughly 50k characters however large the input is.
 */
const MAX_CHUNKS_ENCODED = 24;

function encodeChunked(text: string): number {
  if (text.length <= CHUNK_CHARS) return encode(text);

  const chunkCount = Math.ceil(text.length / CHUNK_CHARS);

  if (chunkCount <= MAX_CHUNKS_ENCODED) {
    let total = 0;
    for (let at = 0; at < text.length; at += CHUNK_CHARS) {
      total += encode(text.slice(at, at + CHUNK_CHARS));
    }
    return total;
  }

  // Beyond that, count an evenly spaced sample and scale by length. Anything
  // this long is being measured to decide whether it fits at all, and the
  // answer does not turn on the last few hundred tokens.
  const stride = Math.floor(chunkCount / MAX_CHUNKS_ENCODED);
  let sampledTokens = 0;
  let sampledChars = 0;
  for (let index = 0; index < MAX_CHUNKS_ENCODED; index += 1) {
    const at = index * stride * CHUNK_CHARS;
    const slice = text.slice(at, at + CHUNK_CHARS);
    sampledTokens += encode(slice);
    sampledChars += slice.length;
  }
  if (sampledChars === 0) return Math.ceil(text.length / 4);
  return Math.ceil((sampledTokens / sampledChars) * text.length);
}

export function estimateTokens(text: string): number {
  // `CompletionRequest.system` is typed as required and is routinely passed as
  // undefined, so this cannot trust the type. The concatenation this replaced
  // hid that by stringifying it, and quietly counted "undefined" every time.
  if (typeof text !== "string" || text.length === 0) return 0;
  try {
    return encodeChunked(text);
  } catch {
    return Math.ceil(text.length / 4);
  }
}

/**
 * Tokens for a whole request, including the per-message framing the provider
 * adds. This is what the window check and the limiter should charge: summing
 * the contents alone undercounts a long conversation by four tokens a turn,
 * which is most of a message once turns are short.
 */
export function countRequestTokens(system: string, messages: readonly ChatMessage[]): number {
  let total = PER_REQUEST_OVERHEAD;
  const systemTokens = estimateTokens(system);
  if (systemTokens > 0) total += systemTokens + PER_MESSAGE_OVERHEAD;
  for (const message of messages ?? []) {
    total += estimateTokens(message.content) + PER_MESSAGE_OVERHEAD;
  }
  return total;
}
