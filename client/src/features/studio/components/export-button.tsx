"use client";

import { Download, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { projectDuration } from "../core/find.ts";
import { ExportCancelled, exportProject } from "../lib/export";
import { useStudio } from "../store/editor-store";

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name.replace(/[^\w\- ]+/g, "").trim() || "video"}.mp4`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function ExportButton() {
  const [progress, setProgress] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);

  const run = async (): Promise<void> => {
    const { history, mediaUrls, title, setNotice, setPlaying } = useStudio.getState();
    if (projectDuration(history.present) <= 0) return setNotice("Add something to the timeline before exporting.");
    setPlaying(false);
    abort.current = new AbortController();
    setProgress(0);
    try {
      const blob = await exportProject(history.present, { urls: mediaUrls, onProgress: setProgress, signal: abort.current.signal });
      download(blob, title);
    } catch (error) {
      if (!(error instanceof ExportCancelled)) setNotice(error instanceof Error ? error.message : "The export failed.");
    } finally {
      setProgress(null);
      abort.current = null;
    }
  };

  if (progress !== null) {
    return (
      <Button variant="outline" size="sm" onClick={() => abort.current?.abort()} aria-label="Cancel export">
        <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />
        {Math.round(progress * 100)}% · Cancel
      </Button>
    );
  }
  return (
    <Button size="sm" onClick={() => void run()}>
      <Download aria-hidden />
      Export
    </Button>
  );
}
