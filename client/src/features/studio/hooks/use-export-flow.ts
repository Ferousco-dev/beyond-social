"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useRef, useState } from "react";

import { confirmAttachment, requestAttachmentUpload } from "@/features/conversation/media-actions";
import { env } from "@/lib/env";

import { projectDuration } from "../core/find.ts";
import { postExport } from "../export-actions";
import { ExportCancelled, exportProject } from "../lib/export";
import { useStudio } from "../store/editor-store";

export type Platform = "youtube" | "tiktok" | "instagram";

export type Destination =
  | { readonly kind: "download" }
  | { readonly kind: "post"; readonly platform: Platform; readonly caption: string; readonly at: Date | null };

export type FlowState =
  | { readonly phase: "idle" }
  | { readonly phase: "rendering"; readonly progress: number }
  | { readonly phase: "uploading" }
  | { readonly phase: "done"; readonly message: string }
  | { readonly phase: "failed"; readonly message: string };

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name.replace(/[^\w\- ]+/g, "").trim() || "video"}.mp4`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Uploads the exported file to the user's own storage and returns its id. */
async function upload(blob: Blob, title: string): Promise<string> {
  const slot = await requestAttachmentUpload({ name: `${title || "video"}.mp4`, mimeType: "video/mp4", size: blob.size });
  if (slot.status !== "ok") throw new Error(slot.message);
  const storage = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { error } = await storage.storage.from("user-media").uploadToSignedUrl(slot.path, slot.token, blob, { contentType: "video/mp4" });
  if (error) throw new Error("The upload did not finish. Try again.");
  const confirmed = await confirmAttachment(slot.id);
  if (confirmed.status !== "ok") throw new Error(confirmed.message);
  return slot.id;
}

export function useExportFlow(): { state: FlowState; start: (to: Destination) => Promise<void>; cancel: () => void; reset: () => void } {
  const [state, setState] = useState<FlowState>({ phase: "idle" });
  const abort = useRef<AbortController | null>(null);
  // One key per attempt at the same post, so a double press posts once.
  const key = useRef(crypto.randomUUID());

  const start = useCallback(async (to: Destination): Promise<void> => {
    const { history, mediaUrls, title, plan, setPlaying } = useStudio.getState();
    if (projectDuration(history.present) <= 0) return setState({ phase: "failed", message: "Add something to the timeline before exporting." });
    setPlaying(false);
    abort.current = new AbortController();
    setState({ phase: "rendering", progress: 0 });
    try {
      const blob = await exportProject(history.present, {
        urls: mediaUrls,
        onProgress: (progress) => setState({ phase: "rendering", progress }),
        signal: abort.current.signal,
        watermark: plan !== "pro",
      });
      if (to.kind === "download") {
        download(blob, title);
        return setState({ phase: "done", message: "Saved to your computer." });
      }
      setState({ phase: "uploading" });
      const mediaId = await upload(blob, title);
      const posted = await postExport({ mediaId, platform: to.platform, caption: to.caption, at: to.at?.toISOString(), idempotencyKey: key.current });
      if (!posted.ok) return setState({ phase: "failed", message: posted.message });
      key.current = crypto.randomUUID();
      setState({ phase: "done", message: to.at ? "Scheduled. You can change or cancel it in Schedule." : "Queued to post. You can follow it in Schedule." });
    } catch (error) {
      if (error instanceof ExportCancelled) return setState({ phase: "idle" });
      setState({ phase: "failed", message: error instanceof Error ? error.message : "The export failed." });
    } finally {
      abort.current = null;
    }
  }, []);

  return { state, start, cancel: useCallback(() => abort.current?.abort(), []), reset: useCallback(() => setState({ phase: "idle" }), []) };
}
