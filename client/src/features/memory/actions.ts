"use server";

import { z } from "zod";

import { goApi } from "@/lib/go-api/client";

export type MemoryResult = { readonly ok: true } | { readonly ok: false; readonly message: string };

const factSchema = z.string().trim().min(1, "Write something to remember.").max(200, "Use 200 characters or fewer.");

export async function saveMemory(content: string): Promise<MemoryResult> {
  const parsed = factSchema.safeParse(content);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check that text." };
  const result = await goApi("/api/v1/memory", z.unknown(), { method: "POST", body: { content: parsed.data } });
  if (!result.ok) return { ok: false, message: result.code === "memory_full" ? "Memory is full. Remove something first." : result.message };
  return { ok: true };
}
