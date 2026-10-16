"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { goApi } from "@/lib/go-api/client";
import { conversationResponse, editorProjectResponse } from "@/lib/go-api/schemas";

const idSchema = z.string().uuid();
const titleSchema = z.string().trim().min(1).max(120);

export type ProjectActionResult = { readonly ok: true } | { readonly ok: false; readonly message: string };

export async function renameProject(kind: "video" | "chat", id: string, title: string): Promise<ProjectActionResult> {
  if (!idSchema.safeParse(id).success || !titleSchema.safeParse(title).success) {
    return { ok: false, message: "Enter a title between 1 and 120 characters." };
  }
  const cleanTitle = title.trim();
  if (kind === "chat") {
    const result = await goApi(`/api/v1/conversations/${id}`, conversationResponse, {
      method: "PATCH",
      body: { title: cleanTitle },
    });
    if (!result.ok) return { ok: false, message: result.message };
    revalidatePath(`/dashboard/c/${id}`);
  } else {
    const current = await goApi(`/api/v1/editor/projects/${id}`, editorProjectResponse);
    if (!current.ok) return { ok: false, message: current.message };
    const saved = await goApi(`/api/v1/editor/projects/${id}`, editorProjectResponse, {
      method: "PUT",
      body: {
        title: cleanTitle,
        document: current.data.data.document,
        expected_version: current.data.data.version,
      },
    });
    if (!saved.ok) return { ok: false, message: saved.message };
    revalidatePath(`/editor/${id}`);
  }
  revalidatePath("/dashboard/projects");
  return { ok: true };
}

export async function deleteProject(kind: "video" | "chat", id: string): Promise<ProjectActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Unknown project." };
  const path = kind === "video" ? `/api/v1/editor/projects/${id}` : `/api/v1/conversations/${id}`;
  const result = await goApi(path, z.null(), { method: "DELETE" });
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
  return { ok: true };
}