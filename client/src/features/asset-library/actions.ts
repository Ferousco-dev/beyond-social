"use server";

import { z } from "zod";

import { goApi, isGoApiConfigured } from "@/lib/go-api/client";

import { ASSET_KINDS, MAX_GROUP_NAME, libraryAssetSchema, libraryGroupSchema, type LibraryAsset, type LibraryGroup } from "./types";

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

const createSchema = z.object({ kind: z.enum(ASSET_KINDS), label: labelSchema, mediaId: idSchema, groupId: idSchema.optional() });

export async function createLibraryAsset(input: z.input<typeof createSchema>): Promise<AssetResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  if (!isGoApiConfigured()) return unconfigured;
  const { kind, label, mediaId, groupId } = parsed.data;
  const result = await goApi("/api/v1/assets", oneResponse, { method: "POST", body: { kind, label, media_id: mediaId } });
  if (!result.ok) return { status: "error", message: result.message };
  // Filed after it is saved: a failed filing keeps the asset, just ungrouped.
  if (groupId) {
    const filed = await assignLibraryGroup(result.data.data.id, groupId);
    if (filed.status === "ok") return filed;
  }
  return { status: "ok", asset: result.data.data };
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

export type GroupResult = { readonly status: "ok"; readonly group: LibraryGroup } | Failure;

const groupList = z.object({ data: z.array(libraryGroupSchema) });
const groupOne = z.object({ data: libraryGroupSchema });
const nameSchema = z.string().trim().min(1, "Give the group a name").max(MAX_GROUP_NAME, `Group names run up to ${MAX_GROUP_NAME} characters`);

/** The person's groups. A server without groups yet answers with none. */
export async function listLibraryGroups(): Promise<readonly LibraryGroup[]> {
  if (!isGoApiConfigured()) return [];
  const result = await goApi("/api/v1/assets/groups", groupList);
  return result.ok ? result.data.data : [];
}

export async function createLibraryGroup(name: string): Promise<GroupResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the name." };
  if (!isGoApiConfigured()) return unconfigured;
  const result = await goApi("/api/v1/assets/groups", groupOne, { method: "POST", body: { name: parsed.data } });
  return result.ok ? { status: "ok", group: result.data.data } : { status: "error", message: result.message };
}

export async function renameLibraryGroup(id: string, name: string): Promise<GroupResult> {
  const parsed = z.object({ id: idSchema, name: nameSchema }).safeParse({ id, name });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the name." };
  if (!isGoApiConfigured()) return unconfigured;
  const result = await goApi(`/api/v1/assets/groups/${parsed.data.id}`, groupOne, { method: "PATCH", body: { name: parsed.data.name } });
  return result.ok ? { status: "ok", group: result.data.data } : { status: "error", message: result.message };
}

/** Deletes the group only; its assets stay in the library. */
export async function deleteLibraryGroup(id: string): Promise<{ readonly status: "ok" } | Failure> {
  if (!idSchema.safeParse(id).success) return { status: "error", message: "That group could not be found." };
  if (!isGoApiConfigured()) return unconfigured;
  const result = await goApi(`/api/v1/assets/groups/${id}`, z.null(), { method: "DELETE" });
  return result.ok ? { status: "ok" } : { status: "error", message: result.message };
}

/** Files an asset in a group, or takes it out of any when groupId is empty. */
export async function assignLibraryGroup(assetId: string, groupId: string): Promise<AssetResult> {
  const parsed = z.object({ assetId: idSchema, groupId: z.union([idSchema, z.literal("")]) }).safeParse({ assetId, groupId });
  if (!parsed.success) return { status: "error", message: "That asset or group could not be found." };
  if (!isGoApiConfigured()) return unconfigured;
  const result = await goApi(`/api/v1/assets/${parsed.data.assetId}/group`, oneResponse, { method: "PUT", body: { group_id: parsed.data.groupId } });
  return result.ok ? { status: "ok", asset: result.data.data } : { status: "error", message: result.message };
}
