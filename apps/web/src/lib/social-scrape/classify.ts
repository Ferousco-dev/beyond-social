import "server-only";

import { logger } from "@/lib/logger";
import { serverEnv } from "@/lib/server-env";

/**
 * Does a post's thumbnail show a person as the main subject?
 *
 * This is what the "human-led" filter on Discover reads. Whether a video is
 * a talking head or a voiceover over b-roll turns out to matter a lot to
 * whether it is worth building from, and there is no field for it in
 * anything a scraper returns.
 *
 * Only the thumbnail is ever looked at, not the video itself. `lib/tiktok/
 * analyse.ts` already documents why the video is out of reach at all
 * (neither platform's scraper hands over the file), and a still the scraper
 * already fetched for the poster frame is a different, much smaller thing
 * than downloading and inspecting the clip.
 *
 * Modelled on `generation/likeness.ts`'s classifier, but the failure bias is
 * the opposite of that one's. There the cost of guessing wrong is a missed
 * consent screen, so every failure resolves toward "person". Here the
 * classification is a browsing convenience, not a safety gate, so a failure
 * resolves toward "unknown" (null): a filter that occasionally shows one
 * extra result it could not classify is a minor annoyance, not a harm, and
 * inventing an answer would make the filter actively wrong rather than
 * merely incomplete.
 */

const ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const TIMEOUT_MS = 15_000;

const PROMPT =
  "Look at this video thumbnail. Is a real human being the main subject of the shot " +
  "(someone talking to camera, demonstrating something, or otherwise the focus), " +
  "as opposed to a product, food, a place, text on screen, or no person at all? " +
  "Answer with exactly one word: PERSON or NO_PERSON.";

/** Chunked: spreading a multi-megabyte array as arguments overflows the stack. */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK));
  }
  return btoa(binary);
}

export async function classifyShowsPerson(thumbnailUrl: string): Promise<boolean | null> {
  if (serverEnv.GEMINI_API_KEY === "") return null;

  let bytes: Uint8Array;
  let mimeType: string;
  try {
    const image = await fetch(thumbnailUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!image.ok) return null;
    mimeType = image.headers.get("content-type") ?? "image/jpeg";
    bytes = new Uint8Array(await image.arrayBuffer());
  } catch {
    return null;
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
        generationConfig: { temperature: 0, maxOutputTokens: 500 },
      }),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const answer = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() ?? "";

    // Checked first: "NO_PERSON" also contains the substring "PERSON".
    if (answer.includes("NO_PERSON")) return false;
    if (answer.includes("PERSON")) return true;
    return null;
  } catch (error) {
    logger.warn("discover person classification failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
