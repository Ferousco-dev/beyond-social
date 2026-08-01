"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/**
 * Renaming, pinning and deleting a project.
 *
 * The sidebar did all three in local state alone, so a rename survived until
 * the next reload, a pin never left the tab it was made in, and a delete only
 * hid the row: the project, its messages and its videos were all still there.
 *
 * Ownership is enforced by RLS on `projects`, which has owner policies for
 * update and delete, so these filter on the id and let the policy decide
 * whether the row is visible at all. A write that matches nothing is not an
 * error, which is why each one reads back what it changed.
 */

const titleSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1, "A project needs a name").max(120),
});

const pinSchema = z.object({ projectId: z.string().uuid(), pinned: z.boolean() });

const idSchema = z.object({ projectId: z.string().uuid() });

export type ProjectResult = { status: "ok" } | { status: "error"; message: string };

export async function renameProject(input: z.input<typeof titleSchema>): Promise<ProjectResult> {
  const parsed = titleSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check that name" };
  }
  if (!isSupabaseConfigured) return { status: "error", message: "Not connected" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ title: parsed.data.title })
    .eq("id", parsed.data.projectId)
    .select("id");

  if (error) {
    logger.error("project rename failed", { error: error.message });
    return { status: "error", message: "Could not rename that project" };
  }
  // No rows means the policy hid it, which for a rename is someone else's
  // project. Reported as a failure so the sidebar puts the old name back.
  if (!data || data.length === 0)
    return { status: "error", message: "Could not rename that project" };

  revalidatePath("/dashboard", "layout");
  return { status: "ok" };
}

export async function setProjectPinned(input: z.input<typeof pinSchema>): Promise<ProjectResult> {
  const parsed = pinSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Invalid input" };
  if (!isSupabaseConfigured) return { status: "error", message: "Not connected" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ pinned: parsed.data.pinned })
    .eq("id", parsed.data.projectId)
    .select("id");

  if (error) {
    logger.error("project pin failed", { error: error.message });
    return { status: "error", message: "Could not pin that project" };
  }
  if (!data || data.length === 0) return { status: "error", message: "Could not pin that project" };

  revalidatePath("/dashboard", "layout");
  return { status: "ok" };
}

/**
 * Deletes a project and, by cascade, its messages, generations, editor
 * documents, summaries and embeddings. Assets and memories are detached rather
 * than removed, because they outlive the project they were made in.
 */
export async function deleteProject(input: z.input<typeof idSchema>): Promise<ProjectResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Invalid input" };
  if (!isSupabaseConfigured) return { status: "error", message: "Not connected" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", parsed.data.projectId)
    .select("id");

  if (error) {
    logger.error("project delete failed", { error: error.message });
    return { status: "error", message: "Could not delete that project" };
  }
  if (!data || data.length === 0)
    return { status: "error", message: "Could not delete that project" };

  revalidatePath("/dashboard", "layout");
  return { status: "ok" };
}
