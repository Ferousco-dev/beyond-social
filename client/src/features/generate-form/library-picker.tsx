"use client";

import Link from "next/link";
import { AudioLines, Check } from "lucide-react";

import { KIND_META, needsConsent, type AssetKind, type LibraryAsset } from "@/features/asset-library/types";
import { cn } from "@/lib/utils";

/**
 * Choosing one saved asset of a kind, or none. Faces and voices without
 * consent are shown but cannot be picked, with the reason beside them.
 */
export function LibraryPicker({
  kind,
  assets,
  value,
  onChange,
  required,
}: {
  kind: AssetKind;
  assets: readonly LibraryAsset[];
  value: string;
  onChange: (asset: LibraryAsset | null) => void;
  required?: boolean;
}) {
  const meta = KIND_META[kind];
  const mine = assets.filter((asset) => asset.kind === kind);

  return (
    <div className="flex flex-col gap-2" role="group" aria-label={meta.plural}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-ink">
          {meta.singular.charAt(0).toUpperCase() + meta.singular.slice(1)}
          {required ? null : <span className="font-normal text-ink-soft"> (optional)</span>}
        </span>
        <Link href="/dashboard/assets" className="text-xs text-primary underline-offset-2 hover:underline">
          {mine.length === 0 ? `Create a ${meta.singular}` : "Manage"}
        </Link>
      </div>
      {mine.length === 0 ? (
        <p className="rounded-xl border border-dashed border-hairline px-3 py-4 text-sm text-ink-soft">
          No {meta.plural.toLowerCase()} saved yet.{" "}
          <Link href="/dashboard/assets" className="font-medium text-primary underline underline-offset-2">
            Create one in Assets
          </Link>{" "}
          and label it clearly, then come back here.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {required ? null : (
            <li>
              <Tile selected={value === ""} onClick={() => onChange(null)} label="None">
                <span className="text-xs text-ink-soft">None</span>
              </Tile>
            </li>
          )}
          {mine.map((asset) => {
            const blocked = needsConsent(kind) && asset.consent_at === null;
            return (
              <li key={asset.id}>
                <Tile
                  selected={value === asset.id}
                  disabled={blocked}
                  onClick={() => onChange(value === asset.id && !required ? null : asset)}
                  label={blocked ? `${asset.label}, needs consent` : asset.label}
                >
                  {asset.file_kind === "audio" ? (
                    <AudioLines className="size-6 text-ink-soft" aria-hidden />
                  ) : asset.file_kind === "video" ? (
                    <video src={asset.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  )}
                </Tile>
                <p className="mt-1 truncate text-xs text-ink">{asset.label}</p>
                {blocked ? <p className="text-[11px] text-ink-soft">Needs consent in Assets</p> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Tile({
  selected,
  disabled,
  onClick,
  label,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border bg-cloud transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50",
        selected ? "border-ink ring-2 ring-ink" : "border-hairline hover:border-ink-soft",
      )}
    >
      {children}
      {selected ? (
        <span className="absolute right-1.5 top-1.5 inline-flex size-5 items-center justify-center rounded-full bg-ink text-paper">
          <Check className="size-3" aria-hidden />
        </span>
      ) : null}
    </button>
  );
}
