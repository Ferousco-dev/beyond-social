"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { confirmAttachment, requestAttachmentUpload } from "@/features/conversation/media-actions";
import { listTwinsResult, type TwinSummary } from "@/features/live-avatar/delete-actions";
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
  const [avatars, setAvatars] = useState<readonly TwinSummary[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const readyAvatars = avatars.filter((avatar) => avatar.trainingStatus === "ready" && avatar.voiceReady);

  useEffect(() => {
    let active = true;
    void listTwinsResult()
      .then((result) => {
        if (!active) return;
        if (result.status === "ok") setAvatars(result.twins);
        else setAvatarError(result.message);
      })
      .catch(() => {
        if (active) setAvatarError("Something went wrong while loading saved avatars. Try again.");
      })
      .finally(() => {
        if (active) setLoadingAvatars(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
      onChange({ firstFrameId: slot.id, avatarId: "" });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">Who should appear?</legend>
        <p className="text-sm leading-relaxed text-ink-soft">Upload a reference image for a new clip, or choose a trained avatar to speak your dialogue.</p>
        <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
          Saved avatar
          <select
            value={values.avatarId}
            onChange={(event) => onChange({ avatarId: event.target.value, ...(event.target.value ? { firstFrameId: "" } : {}) })}
            className="h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-primary"
          >
            <option value="">No saved avatar</option>
            {readyAvatars.map((avatar) => <option key={avatar.id} value={avatar.id}>{avatar.name ?? "Untitled avatar"}</option>)}
          </select>
        </label>
        {loadingAvatars ? <p className="text-xs text-ink-soft">Loading saved avatars…</p> : null}
        {avatarError ? <p role="alert" className="text-xs text-destructive">{avatarError}</p> : null}
        {!loadingAvatars && readyAvatars.length === 0 ? (
          <p className="text-xs text-ink-soft">No trained avatar with a voice yet. <Link href="/dashboard/avatar/new" className="underline underline-offset-2">Create an avatar</Link></p>
        ) : null}
        {values.avatarId ? <p className="text-xs text-ink-soft">Your selected avatar speaks the dialogue. This uses HeyGen.</p> : null}
      </fieldset>

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
          disabled={uploading || values.avatarId !== ""}
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
      {values.avatarId ? <p className="text-xs text-ink-soft">An avatar and reference image are separate modes. Clear the avatar to upload a first frame.</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
