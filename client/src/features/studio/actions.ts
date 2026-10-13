"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { goApi } from "@/lib/go-api/client";
import { editorProjectResponse } from "@/lib/go-api/schemas";

import { emptyProject } from "./core/validate.ts";

export type StudioResult<T = undefined> =
  | { readonly ok: true; readonly value: T; readonly version: number }
  | { readonly ok: false; readonly message: string; readonly conflict: boolean };

const idSchema = z.string().uuid();

const saveSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(120),
  document: z.record(z.unknown()),
  expectedVersion: z.number().int().min(1),
});

export async function saveProject(input: z.input<typeof saveSchema>): Promise<StudioResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "This project could not be saved.", conflict: false };
  const { id, title, document, expectedVersion } = parsed.data;
  const result = await goApi(`/api/v1/editor/projects/${id}`, editorProjectResponse, {
    method: "PUT",
    body: { title, document, expected_version: expectedVersion },
  });
  if (!result.ok) return { ok: false, message: result.message, conflict: result.code === "stale_project" };
  return { ok: true, value: undefined, version: result.data.data.version };
}

export async function createProject(): Promise<StudioResult<string>> {
  const result = await goApi("/api/v1/editor/projects", editorProjectResponse, {
    method: "POST",
    body: { title: "Untitled project", document: emptyProject() },
  });
  if (!result.ok) return { ok: false, message: result.message, conflict: false };
  revalidatePath("/editor");
  return { ok: true, value: result.data.data.id, version: result.data.data.version };
}

export async function deleteProject(id: string): Promise<StudioResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Unknown project.", conflict: false };
  const result = await goApi(`/api/v1/editor/projects/${id}`, z.unknown(), { method: "DELETE" });
  if (!result.ok) return { ok: false, message: result.message, conflict: false };
  revalidatePath("/editor");
  return { ok: true, value: undefined, version: 0 };
}
