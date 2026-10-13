"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useState } from "react";

import { confirmAttachment, requestAttachmentUpload } from "@/features/conversation/media-actions";
import { env } from "@/lib/env";

import { type Asset } from "../core/types.ts";
import { addAsset } from "../core/ops.ts";
import { mediaRef } from "../lib/media-ref";
import { probeDuration } from "../lib/media";
import { useStudio } from "../store/editor-store";

type AssetKind = Asset["kind"];

const kindOf = (type: string): AssetKind | null =>
  type.startsWith("video/") ? "video" : type.startsWith("audio/") ? "audio" : type.startsWith("image/") ? "image" : null;

/** The type without codec parameters ("audio/webm;codecs=opus" becomes "audio/webm"). */
const baseType = (file: File): string => (file.type.split(";")[0] ?? "").toLowerCase();

/**
 * Uploads a file to the user's private storage and adds it to the project's
 * files. Returns the new asset, or null with a notice explaining why not.
 */
export function useUpload(): { upload: (file: File, only: AssetKind) => Promise<Asset | null>; busy: boolean } {
  const [busy, setBusy] = useState(false);

  const upload = useCallback(async (file: File, only: AssetKind): Promise<Asset | null> => {
    const notice = (message: string): null => {
      useStudio.getState().setNotice(message);
      return null;
    };
    const kind = kindOf(baseType(file));
    if (kind !== only) return notice(`Pick a ${only} file.`);
    setBusy(true);
    try {
      const slot = await requestAttachmentUpload({ name: file.name || "upload", mimeType: baseType(file), size: file.size });
      if (slot.status !== "ok") return notice(slot.message);

      const storage = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      const { error } = await storage.storage.from("user-media").uploadToSignedUrl(slot.path, slot.token, file, { contentType: baseType(file) });
      if (error) return notice("The upload did not finish. Try again.");
      const confirmed = await confirmAttachment(slot.id);
      if (confirmed.status !== "ok") return notice(confirmed.message);

      let duration: number | undefined;
      if (kind !== "image") {
        const local = URL.createObjectURL(file);
        duration = await probeDuration(local).catch(() => undefined);
        URL.revokeObjectURL(local);
      }
      const asset: Asset = { src: mediaRef(slot.id), name: file.name.slice(0, 120) || "Upload", kind, ...(duration ? { duration } : {}) };
      useStudio.getState().edit((p) => addAsset(p, asset));
      return asset;
    } finally {
      setBusy(false);
    }
  }, []);

  return { upload, busy };
}
