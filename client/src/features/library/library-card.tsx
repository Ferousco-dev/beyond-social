"use client";

import { Download, Trash2 } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { type LibraryItem } from "@/lib/go-api/schemas";

import { removeFromLibrary } from "./actions";
import { PostForm } from "./post-form";

const KIND: Readonly<Record<string, string>> = {
  video_generate: "Generated",
  video_transform: "Restyled",
  avatar_video: "Avatar",
};

export function LibraryCard({ item }: { readonly item: LibraryItem }): ReactNode {
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = (): void =>
    startTransition(async () => {
      setError(null);
      const result = await removeFromLibrary(item.id);
      if (!result.ok) setError(result.message);
    });

  return (
    <li id={`video-${item.id}`} className="scroll-mt-4 overflow-hidden rounded-xl border border-hairline bg-paper">
      <video
        src={item.video_url}
        poster={item.thumbnail_url}
        controls
        preload="metadata"
        playsInline
        className="aspect-[9/16] max-h-96 w-full bg-ink object-contain"
      />
      <div className="space-y-3 p-4">
        <div>
          <p className="truncate text-sm text-ink">{item.prompt || "Untitled video"}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {KIND[item.type] ?? "Video"} ·{" "}
            <time dateTime={item.created_at}>
              {new Date(item.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
            </time>
          </p>
        </div>
        {posting ? (
          <PostForm jobId={item.id} onDone={() => setPosting(false)} />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setPosting(true)}>Post</Button>
            <a
              href={item.video_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download video"
              className="inline-flex h-11 items-center gap-1.5 rounded-full border border-input px-4 text-sm font-medium text-ink hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Download className="size-4" aria-hidden />
              Download
            </a>
            <Button variant="outline" disabled={pending} onClick={remove} aria-label="Remove from library">
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        )}
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </li>
  );
}
