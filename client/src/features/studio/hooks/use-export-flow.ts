"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useRef, useState } from "react";

import { confirmAttachment, requestAttachmentUpload } from "@/features/conversation/media-actions";
import { env } from "@/lib/env";

import { projectDuration } from "../core/find.ts";
import { postExport } from "../export-actions";
import { useStudio } from "../store/editor-store";

export type Platform = "youtube" | "tiktok" | "instagram";

export type Destination =
  | { readonly kind: "download" }
  | {
      readonly kind: "post";
      readonly platforms: readonly Platform[];
      /** Each platform's own caption and, for YouTube, title. */
      readonly words: Readonly<Partial<Record<Platform, { readonly title: string; readonly caption: string }>>>;
      readonly at: Date | null;
    };

const NAMES: Readonly<Record<Platform, string>> = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram" };

/** "TikTok", "TikTok and Instagram", "YouTube, TikTok and Instagram". */
export function platformList(platforms: readonly Platform[]): string {
  const names = platforms.map((p) => NAMES[p]);
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export type FlowState =
  | { readonly phase: "idle" }
  | { readonly phase: "rendering"; readonly progress: number }
  | { readonly phase: "uploading" }
  | { readonly phase: "done"; readonly message: string }
  | { readonly phase: "failed"; readonly message: string };

/** What to add to the success message when part of the export could not be included. */
function noteOf(warnings: readonly string[]): string {
  return warnings.length > 0 ? ` Heads up: ${warnings.join(" ")}` : "";
}

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
    const { history, mediaUrls, title, setPlaying } = useStudio.getState();
    if (projectDuration(history.present) <= 0) return setState({ phase: "failed", message: "Add something to the timeline before exporting." });
    setPlaying(false);
    abort.current = new AbortController();
    setState({ phase: "rendering", progress: 0 });
    // The export engine is large, so it loads when someone actually exports.
    const { ExportCancelled, exportProject } = await import("../lib/export");
    try {
      const { blob, warnings } = await exportProject(history.present, {
        urls: mediaUrls,
        onProgress: (progress) => setState({ phase: "rendering", progress }),
        signal: abort.current.signal,
      });
      if (to.kind === "download") {
        download(blob, title);
        return setState({ phase: "done", message: `Saved to your computer.${noteOf(warnings)}` });
      }
      setState({ phase: "uploading" });
      // One render and one upload, then one post per account. Each has its own key,
      // so a retry after a partial failure posts only to the accounts still missing.
      const mediaId = await upload(blob, title);
      const results = await Promise.all(
        to.platforms.map(async (platform) => ({
          platform,
          result: await postExport({
            mediaId,
            platform,
            caption: to.words[platform]?.caption ?? "",
            title: (to.words[platform]?.title || title).slice(0, 100),
            at: to.at?.toISOString(),
            idempotencyKey: `${key.current}:${platform}`,
          }),
        })),
      );
      const done = results.filter((r) => r.result.ok).map((r) => r.platform);
      const failed = results.filter((r) => !r.result.ok);
      if (done.length === 0) {
        const first = failed[0]?.result;
        return setState({ phase: "failed", message: first && !first.ok ? first.message : "Nothing could be posted. Try again." });
      }
      if (failed.length === 0) key.current = crypto.randomUUID();
      const what = to.at ? `Scheduled for ${platformList(done)}.` : `Posting to ${platformList(done)}.`;
      const problem = failed.length > 0 ? ` ${platformList(failed.map((f) => f.platform))} did not go: ${failed[0]?.result.ok === false ? failed[0].result.message : ""}` : "";
      setState({ phase: "done", message: `${what} Follow it in Schedule.${problem}${noteOf(warnings)}` });
    } catch (error) {
      if (error instanceof ExportCancelled) return setState({ phase: "idle" });
      // A refused file request (no CORS headers, or offline) surfaces as a bare TypeError from fetch.
      const message = error instanceof TypeError ? "A file could not be fetched for the export. Check your connection and try again." : error instanceof Error ? error.message : "The export failed.";
      setState({ phase: "failed", message });
    } finally {
      abort.current = null;
    }
  }, []);

  return { state, start, cancel: useCallback(() => abort.current?.abort(), []), reset: useCallback(() => setState({ phase: "idle" }), []) };
}
