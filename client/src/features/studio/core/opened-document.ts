import { emptyProject } from "./validate.ts";
import { type ProjectGeneration } from "./types.ts";

/**
 * The document the editor opens with. A project made by Generate holds only
 * its generation record until the video lands, so it opens as an empty project
 * that still carries that record. Dropping it meant the first autosave wrote
 * the project back without the job, and every later visit showed a blank
 * editor with no progress and no failure message.
 */
export function openedDocument(raw: unknown, generation: ProjectGeneration | undefined): unknown {
  const isRecord = typeof raw === "object" && raw !== null && !Array.isArray(raw);
  const isBlank = isRecord && Object.keys(raw).every((key) => key === "generation");
  return isBlank ? emptyProject(generation) : raw;
}
