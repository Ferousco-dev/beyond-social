"use client";

import { useState } from "react";
import { AudioLines, Check, ShieldCheck, Trash2 } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { KIND_META, needsConsent } from "../types";
import type { ShownAsset } from "../use-asset-library";

/** One asset: its preview, an editable label, consent for people, and delete. */
export function AssetTile({
  asset,
  showKind,
  onRelabel,
  onConsent,
  onRemove,
}: {
  asset: ShownAsset;
  showKind: boolean;
  onRelabel: (label: string) => void;
  onConsent: () => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(asset.label);
  const meta = KIND_META[asset.kind];
  const awaitingConsent = needsConsent(asset.kind) && asset.consent_at === null;

  function commit(): void {
    setEditing(false);
    const label = draft.trim();
    if (label !== "" && label !== asset.label) onRelabel(label);
    else setDraft(asset.label);
  }

  return (
    <li className={cn("group flex flex-col overflow-hidden rounded-xl border border-hairline bg-paper", asset.pending && "opacity-70")}>
      <div className="relative aspect-[4/5] bg-cloud">
        <Preview asset={asset} />
        {asset.pending ? (
          <span className="absolute inset-0 flex items-center justify-center bg-paper/40" aria-label="Uploading">
            <Spinner className="size-5" />
          </span>
        ) : (
          <button
            type="button"
            aria-label={`Delete ${asset.label}`}
            onClick={onRemove}
            className="absolute right-2 top-2 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg bg-paper/90 text-ink-soft opacity-0 shadow-sm transition-opacity hover:text-destructive focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-primary group-hover:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5 p-3">
        {editing ? (
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") {
                setDraft(asset.label);
                setEditing(false);
              }
            }}
            maxLength={60}
            aria-label="Label"
            autoFocus
            className="-mx-1 h-7 rounded-md border border-hairline bg-paper px-1 text-sm font-medium text-ink focus:outline-2 focus:outline-primary"
          />
        ) : (
          <button
            type="button"
            disabled={asset.pending}
            onClick={() => setEditing(true)}
            title="Rename"
            className="-mx-1 cursor-text truncate rounded-md px-1 text-left text-sm font-medium text-ink hover:bg-cloud focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default disabled:hover:bg-transparent"
          >
            {asset.label}
          </button>
        )}
        <div className="flex items-center justify-between gap-2 text-xs text-ink-soft">
          <span className="capitalize">{showKind ? meta.singular : asset.file_kind || meta.singular}</span>
          {needsConsent(asset.kind) && !asset.pending ? (
            awaitingConsent ? (
              <button
                type="button"
                onClick={onConsent}
                className="inline-flex cursor-pointer items-center gap-1 font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <ShieldCheck className="size-3.5" aria-hidden />
                Confirm consent
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-success">
                <Check className="size-3.5" aria-hidden />
                Consented
              </span>
            )
          ) : null}
        </div>
      </div>
    </li>
  );
}

function Preview({ asset }: { asset: ShownAsset }) {
  if (asset.url === "") return <Placeholder />;
  if (asset.file_kind === "audio") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-3">
        <AudioLines className="size-10 text-ink-soft" aria-hidden />
        <audio src={asset.url} controls preload="none" className="w-full" aria-label={`Play ${asset.label}`} />
      </div>
    );
  }
  if (asset.file_kind === "video") {
    return <video src={asset.url} muted playsInline loop preload="metadata" className="h-full w-full object-cover" onMouseEnter={(e) => void e.currentTarget.play().catch(() => undefined)} onMouseLeave={(e) => e.currentTarget.pause()} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={asset.url} alt={asset.label} loading="lazy" decoding="async" className="h-full w-full object-cover" />;
}

function Placeholder() {
  return <div className="flex h-full items-center justify-center text-xs text-ink-soft">Preview unavailable</div>;
}
