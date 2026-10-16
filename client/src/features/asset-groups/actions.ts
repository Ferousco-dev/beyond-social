"use server";

import { z } from "zod";

import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import {
  assetGroupDetailResponse,
  assetGroupListResponse,
  assetGroupResponse,
} from "@/lib/go-api/schemas";
import type { AssetGroup, AssetGroupDetail } from "@/lib/go-api/schemas";

export type GroupResult =
  | { readonly status: "ok"; readonly group: AssetGroup }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string };

export type GroupDetailResult =
  | { readonly status: "ok"; readonly group: AssetGroupDetail }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string };

function needApi(): { readonly status: "unconfigured" } | null {
  return isGoApiConfigured() ? null : { status: "unconfigured" };
}

/** All asset groups, newest concept last. */
export async function listAssetGroups(): Promise<
  | { readonly status: "ok"; readonly groups: readonly AssetGroup[] }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string }
> {
  const missing = needApi();
  if (missing) return missing;
  const result = await goApi("/api/v1/asset-groups?limit=100", assetGroupListResponse);
  return result.ok ? { status: "ok", groups: result.data.data } : { status: "error", message: result.message };
}

export async function createAssetGroup(name: string): Promise<GroupResult> {
  const missing = needApi();
  if (missing) return missing;
  const result = await goApi("/api/v1/asset-groups", assetGroupResponse, {
    method: "POST",
    body: { name },
  });
  return result.ok ? { status: "ok", group: result.data.data } : { status: "error", message: result.message };
}

export async function getAssetGroup(id: string): Promise<GroupDetailResult> {
  if (!z.string().uuid().safeParse(id).success) return { status: "error", message: "Unknown group." };
  const missing = needApi();
  if (missing) return missing;
  const result = await goApi(`/api/v1/asset-groups/${id}`, assetGroupDetailResponse);
  if (!result.ok) return { status: "error", message: result.message };
  const group = result.data.data;
  return { status: "ok", group: { ...group, extra_views: group.extra_views ?? [] } };
}

const updateSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  slots: z
    .object({ face: z.string(), voice: z.string(), product: z.string(), environment: z.string() })
    .optional(),
  extras: z.array(z.object({ id: z.string().uuid(), label: z.string().trim().min(1).max(80) })).max(20).optional(),
});

export async function updateAssetGroup(id: string, input: z.input<typeof updateSchema>): Promise<GroupResult> {
  if (!z.string().uuid().safeParse(id).success) return { status: "error", message: "Unknown group." };
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Check the fields and try again." };
  const missing = needApi();
  if (missing) return missing;
  const result = await goApi(`/api/v1/asset-groups/${id}`, assetGroupResponse, {
    method: "PUT",
    body: parsed.data,
  });
  return result.ok ? { status: "ok", group: result.data.data } : { status: "error", message: result.message };
}

export async function deleteAssetGroup(id: string): Promise<{ readonly status: "ok" } | { readonly status: "error"; readonly message: string }> {
  if (!z.string().uuid().safeParse(id).success) return { status: "error", message: "Unknown group." };
  const missing = needApi();
  if (missing) return { status: "error", message: "The backend is not connected yet." };
  const result = await goApi(`/api/v1/asset-groups/${id}`, z.null(), { method: "DELETE" });
  return result.ok ? { status: "ok" } : { status: "error", message: result.message };
}

export async function consentAssetGroup(
  id: string,
  kind: "face" | "voice",
): Promise<GroupResult> {
  if (!z.string().uuid().safeParse(id).success) return { status: "error", message: "Unknown group." };
  const missing = needApi();
  if (missing) return missing;
  const result = await goApi(`/api/v1/asset-groups/${id}/consent`, assetGroupResponse, {
    method: "POST",
    body: { kind },
  });
  return result.ok ? { status: "ok", group: result.data.data } : { status: "error", message: result.message };
}

export type CloneResult =
  | { readonly status: "ok"; readonly voiceId: string; readonly name: string }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string };

const cloneResponse = z.object({ data: z.object({ voice_id: z.string(), name: z.string() }) });

/** Clones an uploaded sample. The group consent gate already passed upstream. */
export async function cloneVoiceSample(input: { name: string; mediaId: string; groupId: string }): Promise<CloneResult> {
  const parsed = z
    .object({ name: z.string().trim().min(1).max(120), mediaId: z.string().uuid(), groupId: z.string().uuid() })
    .safeParse({ name: input.name, mediaId: input.mediaId, groupId: input.groupId });
  if (!parsed.success) return { status: "error", message: "Name the voice and pick its sample." };
  const missing = needApi();
  if (missing) return missing;
  const result = await goApi("/api/v1/voices/clone", cloneResponse, {
    method: "POST",
    body: { name: parsed.data.name, media_id: parsed.data.mediaId, group_id: parsed.data.groupId },
  });
  if (!result.ok) return { status: "error", message: result.message };
  return { status: "ok", voiceId: result.data.data.voice_id, name: result.data.data.name };
}

export type UploadResult =
  | { readonly status: "ok"; readonly mediaId: string }
  | { readonly status: "error"; readonly message: string };
