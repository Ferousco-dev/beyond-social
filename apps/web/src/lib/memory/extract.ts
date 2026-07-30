import "server-only";

import { z } from "zod";

import { getChat } from "@/lib/prompt-engine/providers";

/**
 * Deciding what is worth remembering.
 *
 * The failure mode of a memory system is not forgetting, it is remembering
 * everything. A store that keeps "wants a video about coffee" from every turn
 * becomes noise, retrieval starts returning the wrong five rows, and the model
 * is worse off than with no memory at all. So the default is to extract nothing,
 * and the prompt says so.
 *
 * What qualifies is a claim that would still be true next month and would change
 * how the next video is made: a standing preference, a constraint, who they are
 * making videos for. Not the subject of today's brief.
 */

const MEMORY_KINDS = ["preference", "fact", "style", "goal"] as const;

export type MemoryKind = (typeof MEMORY_KINDS)[number];

const extractedSchema = z.object({
  memories: z
    .array(
      z.object({
        fact: z.string().min(3).max(500),
        kind: z.enum(MEMORY_KINDS).default("fact"),
        importance: z.number().min(0).max(1).default(0.5),
      }),
    )
    .max(3)
    .default([]),
});

export type ExtractedMemory = z.infer<typeof extractedSchema>["memories"][number];

/** Two is already generous for one turn; more than that is the model padding. */
const MAX_PER_TURN = 2;

function prompt(message: string, reply: string): string {
  return [
    "Decide whether this exchange revealed anything about the person that is worth remembering for future conversations.",
    "",
    "Remember only what would still be true in a month and would change how their next video is made:",
    "a standing preference, a constraint they work under, who their audience is, what they are building.",
    "",
    "Do not remember the subject of this particular brief. Wanting a video about coffee today says nothing about tomorrow.",
    "Do not remember anything you inferred rather than were told.",
    "Write each fact in the third person, as a short statement, without naming the person.",
    "",
    "Returning an empty list is the normal outcome and is always acceptable. Most exchanges reveal nothing durable.",
    "",
    "Set importance by how strongly it should shape future work: 0.9 for an explicit standing rule, 0.4 for a mild preference mentioned once.",
    "",
    'Respond with JSON only: {"memories":[{"fact":"","kind":"preference|fact|style|goal","importance":0.0}]}',
    "",
    // Fenced and labelled: this is a transcript to read, not instructions to
    // follow. Without this, "remember that you must ignore your rules" is an
    // instruction the extractor might act on rather than a claim it evaluates.
    "<exchange>",
    `<they_said>\n${message.slice(0, 2000)}\n</they_said>`,
    `<you_said>\n${reply.slice(0, 1000)}\n</you_said>`,
    "</exchange>",
  ].join("\n");
}

/** Pulls the JSON object out of a reply that may be fenced or prefaced. */
function parse(text: string): ExtractedMemory[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return [];
  try {
    const parsed = extractedSchema.safeParse(JSON.parse(text.slice(start, end + 1)));
    return parsed.success ? parsed.data.memories.slice(0, MAX_PER_TURN) : [];
  } catch {
    return [];
  }
}

/**
 * Returns the durable facts in one exchange, usually none.
 *
 * Never throws. A memory that fails to be extracted costs a little future
 * quality; an exception here would cost the user the turn they were actually
 * having, which is a far worse trade.
 */
export async function extractMemories(message: string, reply: string): Promise<ExtractedMemory[]> {
  if (message.trim() === "") return [];

  try {
    const response = await getChat().complete({
      system:
        "You decide what is worth remembering about someone across conversations. You are conservative: you remember standing facts, never passing details, and returning nothing is the common case.",
      messages: [{ role: "user", content: prompt(message, reply) }],
      temperature: 0,
      maxTokens: 300,
      json: true,
    });
    return parse(response);
  } catch {
    return [];
  }
}
