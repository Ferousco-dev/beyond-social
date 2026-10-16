"use server";

import { z } from "zod";

import { goApi } from "@/lib/go-api/client";
import { editorProjectResponse } from "@/lib/go-api/schemas";
import { projectGenerationSchema } from "./core/types.ts";

export type StudioResult<T = undefined> =
  | { readonly ok: true; readonly value: T; readonly version: number }
  | { readonly ok: false; readonly message: string; readonly conflict: boolean };

const idSchema = z.string().uuid();

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  generation: projectGenerationSchema.optional(),
});

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

/** Creates an independent editor project. New videos no longer require a chat. */
export async function createEditorProject(input: z.input<typeof createSchema>): Promise<StudioResult<string>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Give this video a short title.", conflict: false };
  const result = await goApi("/api/v1/editor/projects", editorProjectResponse, {
    method: "POST",
    body: { title: parsed.data.title, document: parsed.data.generation ? { generation: parsed.data.generation } : {} },
  });
  if (!result.ok) return { ok: false, message: result.message, conflict: false };
  return { ok: true, value: result.data.data.id, version: result.data.data.version };
}

/** Finds the editor project for a chat, creating it the first time. */
export async function openEditor(conversationId: string): Promise<StudioResult<string>> {
  if (!idSchema.safeParse(conversationId).success) return { ok: false, message: "Unknown chat.", conflict: false };
  const result = await goApi(`/api/v1/conversations/${conversationId}/editor`, editorProjectResponse, { method: "PUT" });
  if (!result.ok) return { ok: false, message: result.message, conflict: false };
  return { ok: true, value: result.data.data.id, version: result.data.data.version };
}
