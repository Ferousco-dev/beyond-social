"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { PlatformLogo } from "@/components/brand/platform-logo";
import { Chip } from "@/components/ui/choice-chips";

import { parseDimension } from "./format.ts";
import type { RATIOS } from "./types";

type Ratio = (typeof RATIOS)[number];

/** The formats on offer: a platform's own size, named by its logo and its proportions. */
const PRESETS = [
  { platform: "TikTok", logo: "tiktok", name: "TikTok", ratio: "9:16" },
  { platform: "Instagram Reels", logo: "instagram", name: "Instagram", ratio: "9:16" },
] as const;

/**
 * The video's format: TikTok or Instagram (both 9:16), or Custom, which turns
 * into a small box in place for a size such as 16:9, set with Enter.
 */
export function FormatPicker({
  platform,
  ratio,
  onChange,
}: {
  platform: string;
  ratio: Ratio;
  onChange: (patch: { platform?: string; aspectRatio?: Ratio }) => void;
}) {
  const preset = PRESETS.find((item) => item.platform === platform);
  const custom = !preset;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);

  function apply(): void {
    const next = parseDimension(draft);
    if (!next) {
      setInvalid(true);
      return;
    }
    onChange({ platform: "", aspectRatio: next });
    setEditing(false);
    setInvalid(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Format">
      {PRESETS.map((item) => (
        <Chip
          key={item.platform}
          small
          selected={!editing && platform === item.platform}
          onClick={() => {
            setEditing(false);
            onChange({ platform: item.platform, aspectRatio: item.ratio });
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            <PlatformLogo platform={item.logo} colour={false} className="size-3" />
            {item.name}
            <span className="tabular-nums opacity-60">{item.ratio}</span>
          </span>
        </Chip>
      ))}
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
          className={`inline-flex h-7 items-center rounded-full border bg-primary/10 pl-2.5 pr-1 ${invalid ? "border-destructive" : "border-primary"}`}
        >
          <input
            autoFocus
            // Opening it selects what is there, so typing a new size replaces it.
            onFocus={(event) => event.currentTarget.select()}
            aria-label="Custom size, like 16:9"
            aria-invalid={invalid}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setInvalid(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setEditing(false);
            }}
            placeholder="16:9"
            maxLength={11}
            className="w-14 bg-transparent text-xs tabular-nums text-primary outline-none placeholder:text-primary/50"
          />
          <button type="submit" aria-label="Use this size" className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-primary hover:bg-primary/15">
            <Check className="size-3" aria-hidden />
          </button>
        </form>
      ) : (
        <Chip
          small
          selected={custom}
          onClick={() => {
            setDraft(custom ? ratio : "");
            setEditing(true);
          }}
        >
          {custom ? (
            <span className="inline-flex items-center gap-1.5">
              Custom <span className="tabular-nums opacity-60">{ratio}</span>
            </span>
          ) : (
            "Custom"
          )}
        </Chip>
      )}
    </div>
  );
}
