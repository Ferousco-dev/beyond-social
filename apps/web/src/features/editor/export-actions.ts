"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { parseProject } from "@/lib/editor/schema";
import { specFromProject } from "@/lib/editor/render-spec";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/**
 * Turning the timeline into one file.
 *
 * Until now the editor could save a cut and nothing could render it: publishing
 * sent the newest raw generation, so every trim and every reorder was discarded
 * without a word. This queues the actual cut, and publishing prefers the result.
 *
 * The job is a request, not the work. A worker claims it, joins the clips and
 * uploads the result; this only records what was asked for. That split is what
 * lets an export outlive the tab that started it, which matters when joining
 * six clips takes longer than a page visit.
 *
 * The client sends the project, not the file list. Paths are resolved here from
 * the generations the clips came from, so a caller cannot name an object it does
 * not own and have a worker fetch it with the service role.
 */

/** Mirrors the table's own bound, so a refusal is explained rather than a 500. */
const MAX_CLIPS = 20;

const schema = z.object({
  projectId: z.string().uuid(),
  /** The live timeline, which may be ahead of the last autosave. */
  project: z.unknown(),
});

export type ExportResult =
  | { status: "ok"; renderId: string }
  | { status: "unconfigured" }
  /** Nothing on the video track has a finished render behind it. */
  | { status: "empty" }
  | { status: "error"; message: string };

export async function requestExport(input: z.input<typeof schema>): Promise<ExportResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "That timeline could not be read." };
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const project = parseProject(parsed.data.project);
  if (!project) return { status: "error", message: "That timeline could not be read." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to export." };

  /*
   * Row-level security scopes this to the caller's own generations, so a clip
   * pointing at somebody else's render resolves to nothing and is dropped
   * rather than exported.
   */
  const { data: rows } = await supabase
    .from("video_generations")
    .select("id, result_path")
    .eq("project_id", parsed.data.projectId)
    .eq("status", "ready");

  const pathByGeneration = new Map(
    ((rows ?? []) as { id: string; result_path: string | null }[])
      .filter((row): row is { id: string; result_path: string } => row.result_path !== null)
      .map((row) => [row.id, row.result_path]),
  );

  const spec = specFromProject(project, pathByGeneration);
  if (!spec) return { status: "empty" };

  if (spec.clips.length > MAX_CLIPS) {
    return {
      status: "error",
      message: `An export can join up to ${MAX_CLIPS} clips. This one has ${spec.clips.length}.`,
    };
  }

  const { data, error } = await supabase
    .from("project_renders")
    .insert({
      project_id: parsed.data.projectId,
      user_id: user.id,
      // Kept alongside the spec because the queue's bound is written against it,
      // and because it is the honest answer to which objects this job reads.
      clip_paths: spec.clips.map((clip) => clip.path),
      spec,
    })
    .select("id")
    .single();

  if (error || !data) {
    logger.error("could not queue an export", { error: error?.message });
    return { status: "error", message: "Could not start that export just now." };
  }

  revalidatePath(`/editor/${parsed.data.projectId}`);
  return { status: "ok", renderId: (data as { id: string }).id };
}

const statusSchema = z.object({ renderId: z.string().uuid() });

export type ExportStatus =
  | { status: "queued" | "generating" }
  | { status: "ready"; url: string | null }
  | { status: "failed"; message: string }
  | { status: "unknown" };

/** Polled by the editor while an export is in flight. */
export async function getExportStatus(input: z.input<typeof statusSchema>): Promise<ExportStatus> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success || !isSupabaseConfigured) return { status: "unknown" };

  const supabase = await createClient();
  const { data } = await supabase
    .from("project_renders")
    .select("status, result_path, error")
    .eq("id", parsed.data.renderId)
    .maybeSingle();

  const row = data as { status: string; result_path: string | null; error: string | null } | null;
  if (!row) return { status: "unknown" };

  if (row.status === "ready") {
    const { data: signed } = row.result_path
      ? await supabase.storage.from("renders").createSignedUrl(row.result_path, 60 * 60)
      : { data: null };
    return { status: "ready", url: signed?.signedUrl ?? null };
  }

  if (row.status === "failed") {
    return { status: "failed", message: row.error ?? "That export did not finish." };
  }

  return { status: row.status === "generating" ? "generating" : "queued" };
}
