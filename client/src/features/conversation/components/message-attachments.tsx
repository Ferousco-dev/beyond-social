"use client";

import { Film, Music } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { type Attachment } from "@/lib/go-api/schemas";

import { attachmentUrl } from "../media-actions";

/** What a message carried. Pictures are shown; video and audio appear by name. */
export function MessageAttachments({ items }: { readonly items: readonly Attachment[] }): ReactNode {
  return (
    <ul className="mb-1.5 flex flex-wrap justify-end gap-2">
      {items.map((item) => (
        <li key={item.id}>{item.kind === "image" ? <Picture item={item} /> : <Chip item={item} />}</li>
      ))}
    </ul>
  );
}

function Picture({ item }: { readonly item: Attachment }): ReactNode {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void attachmentUrl(item.id).then((value) => live && setUrl(value));
    return () => {
      live = false;
    };
  }, [item.id]);

  return url ? (
    // A short-lived signed link to the user's own file: not suited to next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={item.name} className="max-h-48 max-w-[14rem] rounded-xl border border-hairline object-cover" />
  ) : (
    <span className="block h-24 w-32 animate-pulse rounded-xl bg-cloud" aria-label={`Loading ${item.name}`} />
  );
}

function Chip({ item }: { readonly item: Attachment }): ReactNode {
  const Icon = item.kind === "video" ? Film : Music;
  return (
    <span className="flex max-w-[14rem] items-center gap-2 rounded-xl border border-hairline bg-paper px-3 py-2 text-xs text-ink">
      <Icon className="size-4 shrink-0 text-ink-soft" aria-hidden />
      <span className="truncate">{item.name}</span>
    </span>
  );
}
