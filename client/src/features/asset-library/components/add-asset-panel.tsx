"use client";

import { useId, useRef, useState } from "react";
import { Upload, X } from "lucide-react";

import { Chip } from "@/components/ui/choice-chips";
import { cn } from "@/lib/utils";

import { ASSET_KINDS, KIND_META, fileProblem, type AssetKind } from "../types";

/**
 * Adding one asset: what it is, a clear label, and the file. The label is
 * asked for up front because it is how the asset is found when making a video.
 */
export function AddAssetPanel({
  initialKind,
  onAdd,
  onClose,
}: {
  initialKind: AssetKind;
  onAdd: (kind: AssetKind, label: string, file: File) => void;
  onClose: () => void;
}) {
  const labelId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<AssetKind>(initialKind);
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const meta = KIND_META[kind];
  const problem = file ? fileProblem(kind, file) : null;
  const ready = label.trim() !== "" && file !== null && problem === null;

  function pick(next: File | undefined): void {
    if (!next) return;
    setFile(next);
    if (label.trim() === "") setLabel(next.name.replace(/\.[^.]+$/u, "").replace(/[-_]+/gu, " ").slice(0, 60));
  }

  return (
    <section aria-label="Add an asset" className="rounded-xl border border-hairline bg-paper p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Add {kind === "other" ? "an asset" : `a ${meta.singular}`}</h2>
          <p className="mt-0.5 text-xs text-ink-soft">{meta.hint}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-ink-soft hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Kind">
        {ASSET_KINDS.map((item) => (
          <Chip key={item} selected={kind === item} onClick={() => setKind(item)}>
            {KIND_META[item].plural.replace(/s$/u, "")}
          </Chip>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            pick(event.dataTransfer.files[0]);
          }}
          className={cn(
            "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors focus-visible:outline-2 focus-visible:outline-primary",
            dragging ? "border-primary bg-primary/5" : "border-hairline hover:bg-cloud/60",
          )}
        >
          <Upload className="size-5 text-ink-soft" aria-hidden />
          {file ? (
            <span className="max-w-full truncate text-sm font-medium text-ink">{file.name}</span>
          ) : (
            <span className="text-sm text-ink">
              <span className="font-medium">Choose a file</span> or drop it here
            </span>
          )}
          <span className={cn("text-xs", problem ? "text-destructive" : "text-ink-soft")}>{problem ?? (file ? "Click to choose another" : meta.formats)}</span>
        </button>
        <input ref={fileRef} type="file" accept={meta.accept} className="hidden" onChange={(event) => pick(event.target.files?.[0])} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor={labelId} className="text-sm font-medium text-ink">
            Label
          </label>
          <input
            id={labelId}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={60}
            placeholder={meta.example}
            className="h-11 rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary"
          />
          <p className="text-xs leading-relaxed text-ink-soft">
            Name it so you can tell it apart later: who or what it is, and anything that makes it different. For example, “{meta.example}”.
          </p>
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              if (file) onAdd(kind, label.trim(), file);
            }}
            className="mt-auto inline-flex h-11 cursor-pointer items-center justify-center rounded-[10px] bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add to library
          </button>
        </div>
      </div>
    </section>
  );
}
