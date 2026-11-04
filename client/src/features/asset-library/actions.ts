"use server";

import { z } from "zod";

import { goApi, isGoApiConfigured } from "@/lib/go-api/client";

import { ASSET_KINDS, libraryAssetSchema, type LibraryAsset } from "./types";

type Failure = { readonly status: "unconfigured" } | { readonly status: "error"; readonly message: string };
export type AssetResult = { readonly status: "ok"; readonly asset: LibraryAsset } | Failure;

const listResponse = z.object({ data: z.array(libraryAssetSchema) });
const oneResponse = z.object({ data: libraryAssetSchema });
const idSchema = z.string().uuid();
const labelSchema = z.string().trim().min(1, "Give it a label").max(60, "Labels run up to 60 characters");

const unconfigured = { status: "unconfigured" } as const;

export async function listLibraryAssets(): Promise<{ readonly status: "ok"; readonly assets: readonly LibraryAsset[] } | Failure> {
  if (!isGoApiConfigured()) return unconfigured;
  const result = await goApi("/api/v1/assets", listResponse);
  return result.ok ? { status: "ok", assets: result.data.data } : { status: "error", message: result.message };
}

const createSchema = z.object({ kind: z.enum(ASSET_KINDS), label: labelSchema, mediaId: idSchema });

export async function createLibraryAsset(input: z.input<typeof createSchema>): Promise<AssetResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  if (!isGoApiConfigured()) return unconfigured;
  const { kind, label, mediaId } = parsed.data;
  const result = await goApi("/api/v1/assets", oneResponse, { method: "POST", body: { kind, label, media_id: mediaId } });
  return result.ok ? { status: "ok", asset: result.data.data } : { status: "error", message: result.message };
}

export async function relabelLibraryAsset(id: string, label: string): Promise<AssetResult> {
  const parsed = z.object({ id: idSchema, label: labelSchema }).safeParse({ id, label });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the label." };
  if (!isGoApiConfigured()) return unconfigured;
  const result = await goApi(`/api/v1/assets/${parsed.data.id}`, oneResponse, { method: "PATCH", body: { label: parsed.data.label } });
  return result.ok ? { status: "ok", asset: result.data.data } : { status: "error", message: result.message };
}

export async function consentLibraryAsset(id: string): Promise<AssetResult> {
  if (!idSchema.safeParse(id).success) return { status: "error", message: "That asset could not be found." };
  if (!isGoApiConfigured()) return unconfigured;
  const result = await goApi(`/api/v1/assets/${id}/consent`, oneResponse, { method: "POST" });
  return result.ok ? { status: "ok", asset: result.data.data } : { status: "error", message: result.message };
}

export async function deleteLibraryAsset(id: string): Promise<{ readonly status: "ok" } | Failure> {
  if (!idSchema.safeParse(id).success) return { status: "error", message: "That asset could not be found." };
  if (!isGoApiConfigured()) return unconfigured;
  const result = await goApi(`/api/v1/assets/${id}`, z.null(), { method: "DELETE" });
  return result.ok ? { status: "ok" } : { status: "error", message: result.message };
}
