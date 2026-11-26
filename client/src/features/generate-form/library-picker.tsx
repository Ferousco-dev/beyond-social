"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { AudioLines, Check, ChevronDown, MapPin, Package, UserRound, type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

import { needsConsent, type AssetKind, type LibraryAsset } from "@/features/asset-library/types";

// Radix reserves "" for "nothing chosen", so None travels under this stand-in.
const NONE = "__none__";

/** What stands in for a picture when nothing is chosen, or a saved item has no preview. */
const PLACEHOLDER: Readonly<Partial<Record<AssetKind, LucideIcon>>> = {
  face: UserRound,
  voice: AudioLines,
  product: Package,
  environment: MapPin,
};

function Thumb({ asset, kind }: { asset: LibraryAsset | null; kind: AssetKind }): ReactNode {
  const box = "flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cloud";
  const Icon = PLACEHOLDER[kind] ?? UserRound;
  if (!asset || !asset.url) {
    return (
      <span className={box} aria-hidden>
        <Icon className="size-3.5 text-ink-soft" />
      </span>
    );
  }
  if (asset.file_kind === "audio") {
    return (
      <span className={box} aria-hidden>
        <AudioLines className="size-3.5 text-ink-soft" />
      </span>
    );
  }
  return (
    <span className={box} aria-hidden>
      {asset.file_kind === "video" ? (
        <video src={asset.url} muted playsInline preload="metadata" className="size-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
      )}
    </span>
  );
}

/**
 * One saved asset of a kind, or none, from a dropdown with small previews.
 * A long library stays one line: the list scrolls, and typing a name jumps to
 * it. Faces and voices without consent are listed but cannot be picked.
 * Renders nothing when none of this kind is saved.
 */
export function LibraryPicker({
  kind,
  assets,
  value,
  onChange,
  title,
}: {
  kind: AssetKind;
  assets: readonly LibraryAsset[];
  value: string;
  onChange: (asset: LibraryAsset | null) => void;
  title: string;
}) {
  const mine = assets.filter((asset) => asset.kind === kind);
  if (mine.length === 0) return null;
  const chosen = mine.find((asset) => asset.id === value) ?? null;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs text-ink-soft">{title}</span>
      <RadixSelect.Root value={chosen ? chosen.id : NONE} onValueChange={(next) => onChange(next === NONE ? null : (mine.find((asset) => asset.id === next) ?? null))}>
        <RadixSelect.Trigger
          aria-label={title}
          className="group flex h-10 w-full cursor-pointer items-center gap-2 rounded-[10px] border border-hairline bg-paper pl-1.5 pr-2.5 text-left text-sm text-ink transition-colors hover:bg-cloud/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Thumb asset={chosen} kind={kind} />
          <span className={chosen ? "min-w-0 flex-1 truncate" : "min-w-0 flex-1 truncate text-ink-soft"}>{chosen ? chosen.label : "None"}</span>
          <ChevronDown className="size-4 shrink-0 text-ink-soft transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            className="z-50 max-h-[min(var(--radix-select-content-available-height),320px)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-hairline bg-paper shadow-lg"
          >
            <RadixSelect.Viewport className="p-1">
              <Item value={NONE} label="None" asset={null} kind={kind} />
              {mine.map((asset) => {
                const blocked = needsConsent(kind) && asset.consent_at === null;
                return <Item key={asset.id} value={asset.id} label={asset.label} asset={asset} kind={kind} disabled={blocked} note={blocked ? "Needs consent in Assets" : undefined} />;
              })}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}

function Item({ value, label, asset, kind, disabled, note }: { value: string; label: string; asset: LibraryAsset | null; kind: AssetKind; disabled?: boolean; note?: string }) {
  return (
    <RadixSelect.Item
      value={value}
      disabled={disabled}
      textValue={label}
      className="relative flex cursor-pointer select-none items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-8 text-sm text-ink outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-cloud data-[disabled]:opacity-50"
    >
      <Thumb asset={asset} kind={kind} />
      <span className="min-w-0">
        <RadixSelect.ItemText>{label}</RadixSelect.ItemText>
        {note ? <span className="block text-[11px] text-ink-soft">{note}</span> : null}
      </span>
      <RadixSelect.ItemIndicator className="absolute right-2.5 inline-flex">
        <Check className="size-4 text-ink" aria-hidden />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  );
}
