import "server-only";

import { logger } from "@/lib/logger";
import { serverEnv } from "@/lib/server-env";

/**
 * Does this photo show a real person?
 *
 * The likeness attestation only makes sense for uploads of people. Most photos
 * are products, food, places, screenshots, and asking someone to swear a
 * consent statement over a picture of a shoe is both nonsense and actively
 * harmful: it teaches people to dismiss the dialog, which is the one place the
 * attestation actually has to be read.
 *
 * So the gate is conditional, and this is the condition. It is the one likeness
 * question a model can answer honestly. Whether the face belongs to the person
 * uploading it is unknowable from an image, which is why consent stays an
 * attestation rather than something we pretend to detect.
 *
 * Called directly rather than through the AI gateway because that gateway is
 * text-only: `ChatMessage.content` is a string and every provider adapter is
 * built on it. Teaching it about images is worth doing, and is a change to a
 * shared package that the whole generation path depends on, so it is not being
 * done on the way past. The trade is that this one call has no circuit breaker
 * and no usage accounting.
 */

const ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/** A classification is a few tokens; anything slower than this is a fault. */
const TIMEOUT_MS = 15_000;

const PROMPT =
  "Does this image show a real human being, whether a face, a body, or part of one? " +
  "Answer with exactly one word: PERSON if it shows a real human, " +
  "or OBJECT if it shows anything else, including drawings, cartoons, statues, " +
  "animals, products, food, places, screenshots, or text.";

export type LikenessSubject = "person" | "object";

/**
 * Classifies an image.
 *
 * Returns `person` when it cannot tell. The cost of being wrong is asymmetric:
 * a needless consent dialog over a photo of a shoe is a small annoyance, while
 * a missed one means someone's face was animated with no attestation recorded
 * at all. So an unreachable model, a timeout, or an answer we do not recognise
 * all fail towards asking.
 */
export async function classifySubject(
  bytes: Uint8Array,
  mimeType: string,
): Promise<LikenessSubject> {
  if (serverEnv.GEMINI_API_KEY === "") {
    logger.warn("no vision key, treating the upload as a person");
    return "person";
  }

  try {
    const response = await fetch(`${ENDPOINT}?key=${serverEnv.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: toBase64(bytes) } },
            ],
          },
        ],
        // One word out. Left unbounded, the model writes a paragraph and the
        // classification costs more than the thing it is guarding.
        generationConfig: { temperature: 0, maxOutputTokens: 500 },
      }),
    });

    if (!response.ok) {
      logger.warn("vision call failed", { status: response.status });
      return "person";
    }

    const body = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const answer = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() ?? "";

    if (answer.includes("OBJECT")) return "object";
    if (answer.includes("PERSON")) return "person";

    logger.warn("unrecognised vision answer, treating as a person", {
      answer: answer.slice(0, 40),
    });
    return "person";
  } catch (error) {
    logger.warn("vision call threw, treating as a person", {
      error: error instanceof Error ? error.message : String(error),
    });
    return "person";
  }
}

/** Chunked: spreading a multi-megabyte array as arguments overflows the stack. */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK));
  }
  return btoa(binary);
}
