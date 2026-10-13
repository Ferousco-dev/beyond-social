"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { goApi } from "@/lib/go-api/client";
import { emptyResponse } from "@/lib/go-api/admin-schemas";

export type AdminResult = { readonly ok: true } | { readonly ok: false; readonly message: string };

const NAME = z.string().regex(/^[a-z_]{2,40}$/);

async function send(
  path: string,
  method: "PUT" | "POST" | "DELETE",
  body: unknown,
  refresh: string,
): Promise<AdminResult> {
  const result = await goApi(path, emptyResponse, { method, body });
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath(refresh);
  return { ok: true };
}

const invalid: AdminResult = { ok: false, message: "Check the values and try again." };

export async function saveProviderKey(name: string, value: string): Promise<AdminResult> {
  if (!NAME.safeParse(name).success || value.trim() === "") return invalid;
  return send(`/api/v1/admin/providers/${name}`, "PUT", { value: value.trim() }, "/dashboard/admin/providers");
}

export async function clearProviderKey(name: string): Promise<AdminResult> {
  if (!NAME.safeParse(name).success) return invalid;
  return send(`/api/v1/admin/providers/${name}`, "DELETE", undefined, "/dashboard/admin/providers");
}

export async function savePrice(action: string, credits: number, enabled: boolean): Promise<AdminResult> {
  if (!/^[a-z0-9_:]{2,60}$/.test(action) || !Number.isInteger(credits) || credits < 0) return invalid;
  return send(`/api/v1/admin/credits/prices/${action}`, "PUT", { credits, enabled }, "/dashboard/admin/pricing");
}

export async function saveSetting(key: string, value: number): Promise<AdminResult> {
  if (!NAME.safeParse(key).success || !Number.isInteger(value) || value < 0) return invalid;
  return send(`/api/v1/admin/credits/settings/${key}`, "PUT", { value }, "/dashboard/admin/pricing");
}

export async function adjustUserCredits(userId: string, amount: number, reason: string): Promise<AdminResult> {
  if (!z.string().uuid().safeParse(userId).success || !Number.isInteger(amount) || amount === 0 || reason.trim() === "") {
    return { ok: false, message: "Enter a whole, non-zero amount and a reason." };
  }
  return send(`/api/v1/admin/users/${userId}/credits`, "POST", { amount, reason: reason.trim() }, `/dashboard/admin/users/${userId}`);
}

export async function resolveAlert(id: string): Promise<AdminResult> {
  if (!z.string().uuid().safeParse(id).success) return invalid;
  return send(`/api/v1/admin/alerts/${id}/resolve`, "POST", undefined, "/dashboard/admin/alerts");
}

const packSchema = z.object({
  name: z.string().trim().min(1).max(60),
  credits: z.number().int().min(1).max(1_000_000),
  priceCents: z.number().int().min(50).max(10_000_000),
  enabled: z.boolean(),
  sort: z.number().int().min(0).max(1000),
});

/** Creates a credit pack, or changes one when `id` is given. */
export async function saveCreditPack(id: string | null, input: z.input<typeof packSchema>): Promise<AdminResult> {
  const parsed = packSchema.safeParse(input);
  if (!parsed.success || (id !== null && !z.string().uuid().safeParse(id).success)) return invalid;
  const { priceCents, ...rest } = parsed.data;
  return send(id ? `/api/v1/admin/packs/${id}` : "/api/v1/admin/packs", id ? "PUT" : "POST", { ...rest, price_cents: priceCents, currency: "usd" }, "/dashboard/admin/packs");
}

export async function deleteCreditPack(id: string): Promise<AdminResult> {
  if (!z.string().uuid().safeParse(id).success) return invalid;
  return send(`/api/v1/admin/packs/${id}`, "DELETE", undefined, "/dashboard/admin/packs");
}

const FROM = z.string().trim().min(3).max(120);

/** The name and address the product's emails come from. */
export async function saveEmailFrom(from: string): Promise<AdminResult> {
  if (!FROM.safeParse(from).success) return invalid;
  return send("/api/v1/admin/email", "PUT", { from: from.trim() }, "/dashboard/admin/providers");
}

const MODEL = z.string().regex(/^(gemini|openrouter:[A-Za-z0-9._\-/:]{1,150})$/);

/** Chooses which model answers one kind of request. Gemini is the default. */
export async function chooseModel(role: string, model: string): Promise<AdminResult> {
  if (!NAME.safeParse(role).success || !MODEL.safeParse(model).success) return invalid;
  return send(`/api/v1/admin/models/${role}`, "PUT", { model }, "/dashboard/admin/models");
}
