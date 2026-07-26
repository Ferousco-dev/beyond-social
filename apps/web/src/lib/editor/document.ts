import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import { parseProject } from "./schema";
import { INITIAL_PROJECT } from "./project";
import { type Project } from "./types";

/** Loading a saved timeline. */

export interface EditorDocument {
  readonly project: Project;
  /** 0 when nothing has been saved yet, which the save path treats as a create. */
  readonly revision: number;
  /** False when the timeline is the starting template rather than saved work. */
  readonly saved: boolean;
}

export async function getEditorDocument(projectId: string): Promise<EditorDocument> {
  const fresh: EditorDocument = { project: INITIAL_PROJECT, revision: 0, saved: false };
  if (!isSupabaseConfigured || projectId === "new") return fresh;

  const supabase = await createClient();
  const { data } = await supabase
    .from("editor_documents")
    .select("document, revision")
    .eq("project_id", projectId)
    .maybeSingle();

  const row = data as { document: unknown; revision: number } | null;
  if (!row) return fresh;

  // A document that no longer parses degrades to the starting template rather
  // than crashing the editor. Losing an unreadable edit is bad; a white screen
  // with no way back is worse.
  const project = parseProject(row.document);
  if (!project) return fresh;

  return { project, revision: row.revision, saved: true };
}
