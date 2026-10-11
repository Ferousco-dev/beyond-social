import "server-only";

import { logger } from "@/lib/logger";
import { parseJsonReply } from "@/lib/brief/schema";
import { HOOK_PATTERN_DESCRIPTIONS, HOOK_PATTERNS } from "@/lib/hooks/taxonomy";
import { getPromptTemplate } from "@/lib/prompts/registry";
import { serverEnv } from "@/lib/server-env";
import { fenceSafe } from "@/lib/text/fence";
import { STRUCTURE_BEAT_PROMPTS } from "@/lib/tiktok/structure";

import { type AnalysablePost, evidence, postAnalysisSchema, type PostAnalysis } from "./analyse";

/**
 * The same format-reading task as `analyse.ts`, but for the "deep" tier that
 * actually watches the clip instead of reading numbers about it.
 *
 * Called directly against Gemini, the same as `generation/likeness.ts` and
 * `social-scrape/classify.ts`: the ai-gateway package `analysePost` calls
 * through `getJudge()` is text-only end to end (`ChatMessage.content` is a
 * string), and teaching it video is a change to a shared package the whole
 * generation path depends on, not something to do on the way past.
 */

const ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/** Video takes longer to process than a still image or a text-only judge call. */
const TIMEOUT_MS = 45_000;

/** Overridable via prompt_templates under this key; this is the fallback. */
const SYSTEM_KEY = "discover.analysis.deep.system";
const SYSTEM =
  "You work out the repeatable format behind a short-form video by watching it. You are " +
  "rigorous about grounding every claim in what the footage, the caption, and the numbers " +
  "actually show, and you say so plainly when something is genuinely ambiguous.";

function buildPrompt(post: AnalysablePost, industry: string | null): string {
  return [
    "The video below is the post. Watch it, then work out the repeatable format behind it.",
    "Everything measurable about the post follows the video, as supporting context: the caption, the hashtags, and the engagement numbers.",
    "",
    "You can now describe what is actually on screen: the setting, the framing, the cuts, any on-screen text, and what is said, grounded in what you watched rather than the caption alone.",
    "",
    "Set `confidence` honestly: high when the footage, the caption and the numbers agree, lower when the footage is ambiguous or the audio is hard to make out.",
    "",
    "Classify `hookPattern` against exactly this list, picking the closest one rather than inventing your own:",
    HOOK_PATTERNS.map((pattern) => `- ${pattern}: ${HOOK_PATTERN_DESCRIPTIONS[pattern]}`).join(
      "\n",
    ),
    "",
    "Break `structure` into what happens in each beat, one sentence each, not why it works:",
    ...STRUCTURE_BEAT_PROMPTS,
    "Leave a beat `null` rather than inventing one: plenty of posts have no escalation and never ask for anything.",
    "",
    industry !== null
      ? `Write \`brief\` for a creator in the ${industry} industry: the same format, applied to their own subject.`
      : "Write `brief` so the same format can be applied to a different subject.",
    "`brief` is handed straight to a video generator, so it must describe what should be on screen and must not mention this post, this analysis, or TikTok.",
    "",
    'Respond with JSON only: {"format":"","hook":"","hookPattern":"other","structure":{"hook":"","problem":null,"escalation":null,"payoff":null,"cta":null},"whyItWorks":"","brief":"","confidence":"low"}',
    "",
    `<post>\n${fenceSafe(evidence(post))}\n</post>`,
  ]
    .filter(Boolean)
    .join("\n");
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

export interface DeepAnalysisVideo {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
}

export async function analysePostDeep(
  post: AnalysablePost,
  video: DeepAnalysisVideo,
  industry: string | null,
): Promise<PostAnalysis | null> {
  if (serverEnv.GEMINI_API_KEY === "") return null;

  try {
    const system = await getPromptTemplate(SYSTEM_KEY, SYSTEM);
    const response = await fetch(`${ENDPOINT}?key=${serverEnv.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [
          {
            parts: [
              { text: buildPrompt(post, industry) },
              { inline_data: { mime_type: video.mimeType, data: toBase64(video.bytes) } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      logger.warn("deep post analysis call failed", {
        status: response.status,
        detail: detail.slice(0, 300),
      });
      return null;
    }

    const body = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const reply = body.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const parsed = parseJsonReply(reply, postAnalysisSchema);
    if ("data" in parsed) return parsed.data;

    logger.warn("deep post analysis did not parse", {
      reason: parsed.reason,
      reply: reply.slice(0, 400),
    });
    return null;
  } catch (error) {
    logger.warn("deep post analysis failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
