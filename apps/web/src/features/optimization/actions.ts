"use server";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { generateCaptions, type CaptionSet } from "@/lib/optimization/captions";

const schema = z.object({ brief: z.string().trim().min(3).max(4000) });

export type CaptionResult =
  { status: "ok"; captions: CaptionSet } | { status: "error"; message: string };

/** Writes a caption and hashtags for every platform from one brief. */
export async function writeCaptions(input: z.input<typeof schema>): Promise<CaptionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Describe the video first, then generate captions." };
  }

  try {
    return { status: "ok", captions: await generateCaptions(parsed.data.brief) };
  } catch (error) {
    logger.error("caption generation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "Could not write captions just now." };
  }
}
