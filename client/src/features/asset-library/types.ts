import { z } from "zod";

import { standardType } from "@/lib/file-type";

export const ASSET_KINDS = ["face", "voice", "product", "environment", "music", "other"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const libraryAssetSchema = z.object({
  id: z.string(),
  kind: z.enum(ASSET_KINDS),
  label: z.string(),
  media_id: z.string(),
  consent_at: z.string().nullable(),
  created_at: z.string(),
  file_kind: z.string(),
  url: z.string(),
});
export type LibraryAsset = z.infer<typeof libraryAssetSchema>;

interface KindMeta {
  readonly plural: string;
  readonly singular: string;
  /** What the file picker offers; the server checks the file again. */
  readonly accept: string;
  readonly formats: string;
  readonly example: string;
  readonly hint: string;
}

export const KIND_META: Readonly<Record<AssetKind, KindMeta>> = {
  face: {
    plural: "Faces",
    singular: "face",
    accept: "image/jpeg,image/png",
    formats: "JPG or PNG",
    example: "Ada, front, smiling",
    hint: "A clear, front-facing photo of one person.",
  },
  voice: {
    plural: "Voices",
    singular: "voice",
    accept: "audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/ogg,.mp3,.wav,.m4a,.ogg",
    formats: "MP3, WAV, M4A or OGG",
    example: "Ada, warm narration",
    hint: "A clean recording of one person speaking, 30 seconds or more.",
  },
  product: {
    plural: "Products",
    singular: "product",
    accept: "image/*,video/*",
    formats: "Image or video",
    example: "Glow serum, 50ml bottle",
    hint: "The product on its own, well lit.",
  },
  environment: {
    plural: "Environments",
    singular: "environment",
    accept: "image/*,video/*",
    formats: "Image or video",
    example: "Kitchen, morning light",
    hint: "The place the video is set in.",
  },
  music: {
    plural: "Music",
    singular: "track",
    accept: "audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/ogg,.mp3,.wav,.m4a,.ogg",
    formats: "MP3, WAV, M4A or OGG",
    example: "Upbeat intro, 30s loop",
    hint: "Background music you have the rights to use.",
  },
  other: {
    plural: "Others",
    singular: "asset",
    accept: "image/*,video/*,audio/*",
    formats: "Image, video or audio",
    example: "Logo, white on transparent",
    hint: "Logos, b-roll, sound effects, anything else.",
  },
};

/** Faces and voices capture a real person, so they need consent before use. */
export const needsConsent = (kind: AssetKind): boolean => kind === "face" || kind === "voice";

// The lip-sync model reads only these, so faces and voices are held to them
// before upload; the server checks again.
const LIP_SYNC_TYPES: Partial<Record<AssetKind, readonly string[]>> = {
  face: ["image/jpeg", "image/png"],
  voice: ["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg"],
};

/** Why a file cannot be saved as this kind, or null when it can. */
export function fileProblem(kind: AssetKind, file: File): string | null {
  const allowed = LIP_SYNC_TYPES[kind];
  if (!allowed || allowed.includes(standardType(file.type))) return null;
  return `A ${KIND_META[kind].singular} must be ${KIND_META[kind].formats}, so it lip-syncs correctly. This file is ${file.type || "an unknown type"}.`;
}
