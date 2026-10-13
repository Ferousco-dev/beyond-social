"use server";

import { z } from "zod";

import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import {
  attachmentResponse,
  uploadSlotResponse,
  viewUrlResponse,
  type Attachment,
} from "@/lib/go-api/schemas";

export type SlotResult =
  | { readonly status: "ok"; readonly id: string; readonly path: string; readonly token: string }
  | { readonly status: "error"; readonly message: string };

export type ConfirmResult =
  | { readonly status: "ok"; readonly attachment: Attachment }
  | { readonly status: "error"; readonly message: string };

const requestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  mimeType: z.string().min(3).max(100),
  size: z.number().int().positive(),
});

/** A one-time upload slot. The server picks the path and checks the type and size. */
export async function requestAttachmentUpload(input: z.input<typeof requestSchema>): Promise<SlotResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "That file cannot be attached." };
  if (!isGoApiConfigured()) return { status: "error", message: "Attachments are not available right now." };

  const result = await goApi("/api/v1/media", uploadSlotResponse, {
    method: "POST",
    body: { name: parsed.data.name, mime_type: parsed.data.mimeType, size_bytes: parsed.data.size },
  });
  return result.ok ? { status: "ok", ...result.data.data } : { status: "error", message: result.message };
}

/** Tells the server the upload finished, so the file becomes usable. */
export async function confirmAttachment(id: string): Promise<ConfirmResult> {
  if (!z.string().uuid().safeParse(id).success) return { status: "error", message: "Unknown file." };
  const result = await goApi(`/api/v1/media/${id}/confirm`, attachmentResponse, { method: "POST" });
  return result.ok
    ? { status: "ok", attachment: result.data.data }
    : { status: "error", message: result.message };
}

/** A short-lived link for showing the user their own file. */
export async function attachmentUrl(id: string): Promise<string | null> {
  if (!z.string().uuid().safeParse(id).success) return null;
  const result = await goApi(`/api/v1/media/${id}/url`, viewUrlResponse);
  return result.ok ? result.data.data.url : null;
}
