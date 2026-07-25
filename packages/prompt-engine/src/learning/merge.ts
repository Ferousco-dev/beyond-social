import type { Chunk } from "../schema/chunk";
import type { DraftChunk } from "../schema/learning";
import type { Llm } from "../ports";

/**
 * Synthesizes an existing chunk and an overlapping new draft into one improved
 * chunk body, rather than storing a near-duplicate. This is the anti-pollution
 * mechanism: the base gets sharper, not larger. The merge is LLM-assisted
 * because deduplication of prose requires understanding, not string diffing; the
 * result is still gated and versioned by the pipeline.
 */
export class KnowledgeMerger {
  constructor(private readonly llm: Llm) {}

  async merge(existing: Chunk, draft: DraftChunk): Promise<string> {
    return this.llm.complete({
      system:
        "You merge two overlapping knowledge notes into one tighter note. Output only the merged Markdown body.",
      messages: [
        {
          role: "user",
          content: [
            "Merge the NEW insight into the EXISTING note. Keep everything correct",
            "and non-redundant, prefer the clearer phrasing, and do not lengthen for",
            "its own sake. Preserve the claim / why / example shape. Output only the",
            "merged body, no preamble.",
            "",
            "EXISTING:",
            existing.body,
            "",
            "NEW:",
            draft.body,
          ].join("\n"),
        },
      ],
      temperature: 0.2,
    });
  }
}
