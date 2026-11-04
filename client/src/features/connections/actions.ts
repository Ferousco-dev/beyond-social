"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { goApi } from "@/lib/go-api/client";
import { connectUrlResponse } from "@/lib/go-api/schemas";
import { emptyResponse } from "@/lib/go-api/admin-schemas";

const platform = z.enum(["youtube", "tiktok", "instagram"]);

export type ConnectResult =
  | { readonly status: "ok"; readonly url: string }
  | { readonly status: "error"; readonly message: string };

/** Where to send the browser to sign in to the platform. */
export async function startConnect(input: string): Promise<ConnectResult> {
  const parsed = platform.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Unknown platform." };
  const result = await goApi(`/api/v1/social/${parsed.data}/connect`, connectUrlResponse, { method: "POST" });
  return result.ok ? { status: "ok", url: result.data.data.url } : { status: "error", message: result.message };
}

export async function disconnect(input: string): Promise<{ readonly ok: boolean; readonly message?: string }> {
  const parsed = platform.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Unknown platform." };
  const result = await goApi(`/api/v1/social/${parsed.data}`, emptyResponse, { method: "DELETE" });
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/dashboard/connections");
  return { ok: true };
}
