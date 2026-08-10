import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { signRenders } from "@/lib/generation/render-url";
import { createClient } from "@/lib/supabase/server";

import { emptyProject, projectFromGenerations, type GenerationClip } from "./from-generations";
import { parseProject } from "./schema";
import { withFreshSources } from "./sources";
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
  const blank: EditorDocument = { project: emptyProject(), revision: 0, saved: false };
  if (!isSupabaseConfigured || projectId === "new") return blank;

  const supabase = await createClient();

  const [{ data }, { data: renders }] = await Promise.all([
    supabase
      .from("editor_documents")
      .select("document, revision")
      .eq("project_id", projectId)
      .maybeSingle(),
    // Finished renders only: a queued or failed generation has no file to cut.
    supabase
      .from("video_generations")
      .select("id, prompt, result_url, result_path, duration")
      .eq("project_id", projectId)
      .eq("status", "ready")
      .order("created_at", { ascending: true }),
  ]);

  /**
   * With no saved document the timeline is assembled from the project's own
   * renders. It used to open on a hardcoded four-clip template, so every
   * project showed the same invented cuts whatever the user had actually made.
   */
  // Signed here rather than stored: the renders bucket is private, so the
  // column holds a path and the timeline needs something playable.
  const signedRenders = await signRenders(
    supabase,
    ((renders ?? []) as { result_path: string | null }[]).map((row) => row.result_path),
  );

  const clips: GenerationClip[] = (
    (renders ?? []) as {
      id: string;
      prompt: string;
      result_url: string | null;
      result_path: string | null;
      duration: number | null;
    }[]
  ).map((row) => ({
    id: row.id,
    prompt: row.prompt,
    resultUrl: row.result_path ? (signedRenders.get(row.result_path) ?? null) : null,
    durationSeconds: row.duration,
  }));

  // Keyed by generation, which is what a saved clip remembers. The signed URL
  // it was saved with has long since expired.
  const urlByGeneration = new Map(
    clips
      .filter((clip): clip is GenerationClip & { resultUrl: string } => clip.resultUrl !== null)
      .map((clip) => [clip.id, clip.resultUrl]),
  );

  const fresh: EditorDocument = {
    project: clips.length > 0 ? projectFromGenerations(clips) : emptyProject(),
    revision: 0,
    saved: false,
  };

  const row = data as { document: unknown; revision: number } | null;
  if (!row) return fresh;

  // A document that no longer parses degrades to the starting template rather
  // than crashing the editor. Losing an unreadable edit is bad; a white screen
  // with no way back is worse.
  const project = parseProject(row.document);
  if (!project) return fresh;

  return { project: withFreshSources(project, urlByGeneration), revision: row.revision, saved: true };
}
