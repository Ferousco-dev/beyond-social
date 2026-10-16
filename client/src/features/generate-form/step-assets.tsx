"use client";

import { useRef, useState } from "react";

import { confirmAttachment, requestAttachmentUpload } from "@/features/conversation/media-actions";
import { createClient } from "@/lib/supabase/client";

import type { GenerateFormValues } from "./types";

/** Step D: one reference picture the clip starts from. Saved reuse follows. */
export function StepAssets({
  values,
  onChange,
}: {
  values: GenerateFormValues;
  onChange: (patch: Partial<GenerateFormValues>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File): Promise<void> {
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const slot = await requestAttachmentUpload({ name: file.name, mimeType: file.type, size: file.size });
      if (slot.status !== "ok") {
        setError(slot.message);
        return;
      }
      const supabase = createClient();
      const { error: putError } = await supabase.storage
        .from("user-media")
        .uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type });
      if (putError) throw new Error(putError.message);
      const confirmed = await confirmAttachment(slot.id);
      if (confirmed.status !== "ok") {
        setError(confirmed.message);
        return;
      }
      onChange({ firstFrameId: slot.id });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-ink-soft">
        A face, product, or setting photo. The clip starts from this frame. Saved faces,
        products, and backgrounds with reuse across projects arrive with the asset library.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        aria-hidden
        tabIndex={-1}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud disabled:opacity-40"
        >
          {uploading ? "Uploading…" : values.firstFrameId !== "" ? "Replace picture" : "Upload picture"}
        </button>
        {values.firstFrameId !== "" ? (
          <button
            type="button"
            onClick={() => onChange({ firstFrameId: "" })}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] border border-hairline px-4 text-sm text-ink-soft transition-colors hover:bg-cloud"
          >
            Remove
          </button>
        ) : null}
      </div>
      {values.firstFrameId !== "" ? (
        <p className="text-xs text-ink-soft">Attached. It travels with the generation below.</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
