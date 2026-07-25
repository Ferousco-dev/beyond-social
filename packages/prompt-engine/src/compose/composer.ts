import type { GenerationRequest } from "../schema/feedback";
import type { Recipe } from "../schema/recipe";
import type { RetrievalResult } from "../retrieval/pipeline";

export interface ComposedPrompt {
  system: string;
  user: string;
  /** Exact chunk ids+versions assembled, recorded for reproducibility. */
  chunkRefs: { id: string; version: number }[];
}

const OUTPUT_CONTRACT = [
  "Output requirements:",
  "- Apply the retrieved knowledge; do not restate it.",
  "- Prefer specific, senior-level decisions over generic advice.",
  "- Respect the brand and accessibility guidance exactly.",
].join("\n");

/**
 * Assemble the final prompt. Stable content (system layers) goes in the system
 * message so it stays prompt-cache friendly; the volatile parts (retrieved
 * knowledge and the task) go in the user message. Knowledge is grouped by slot
 * in recipe order, which the recipe author controls to shape the model's focus.
 */
export function composePrompt(
  request: GenerationRequest,
  recipe: Recipe,
  retrieval: RetrievalResult,
  systemLayers: ReadonlyMap<string, string>,
): ComposedPrompt {
  const system = recipe.systemLayers
    .map((id) => systemLayers.get(id))
    .filter((text): text is string => text !== undefined && text.trim() !== "")
    .join("\n\n");

  const knowledge = retrieval.slots
    .filter((result) => result.chunks.length > 0)
    .map((result) => {
      const body = result.chunks.map((c) => `### ${c.chunk.title}\n${c.chunk.body}`).join("\n\n");
      return `## ${result.slot.name}\n${body}`;
    })
    .join("\n\n");

  const user = [
    "# Task",
    request.prompt.trim(),
    "",
    "# Retrieved knowledge",
    knowledge === "" ? "(none retrieved)" : knowledge,
    "",
    OUTPUT_CONTRACT,
  ].join("\n");

  return {
    system,
    user,
    chunkRefs: retrieval.selected.map((c) => ({ id: c.chunk.id, version: c.chunk.version })),
  };
}
