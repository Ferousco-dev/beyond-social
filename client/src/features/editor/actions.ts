"use server";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { projectSchema } from "@/lib/editor/schema";
import { type Project } from "@/lib/editor/types";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/** Saving a timeline. */

const saveSchema = z.object({
  projectId: z.string().uuid(),
  project: projectSchema,
  /** The revision the client loaded; 0 means "no document yet". */
  revision: z.number().int().min(0),
});

/**
 * Stated rather than inferred from the schema.
 *
 * The domain type is deeply readonly and Zod infers mutable arrays, so deriving
 * the input would force every caller to strip `readonly` from its own state.
 * The schema still does the validating; this only describes what may be passed.
 */
export interface SaveInput {
  readonly projectId: string;
  readonly project: Project;
  readonly revision: number;
}

export type SaveResult =
  | { status: "ok"; revision: number }
  | { status: "conflict" }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

/**
 * Persists the timeline.
 *
 * The document is validated here even though it came from our own editor: it
 * round-trips through the browser, so by the time it comes back it is input
 * like any other.
 */
export async function saveEditorDocument(input: SaveInput): Promise<SaveResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "That timeline could not be saved" };
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("editor_document_save", {
    p_project: parsed.data.projectId,
    p_document: parsed.data.project,
    p_expected_revision: parsed.data.revision,
  });

  if (error) {
    // PT409 is the revision mismatch raised by the function: another tab or
    // device saved first, so this is a real outcome rather than a failure.
    // It was 40001, which PostgREST swallows as a transport-level serialisation
    // error, leaving the client unable to tell a conflict from an outage.
    if (error.code === "PT409") return { status: "conflict" };
    logger.error("editor save failed", { error: error.message });
    return { status: "error", message: "Could not save your changes" };
  }

  return { status: "ok", revision: typeof data === "number" ? data : parsed.data.revision + 1 };
}
