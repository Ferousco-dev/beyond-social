"use client";

import Link from "next/link";

import { useLibrary } from "@/features/asset-library/use-library";

import { LookCards } from "./look-cards";
import { ENVIRONMENT_CARDS, STYLE_CARDS } from "./look-art";

/** The look and the setting, from presets and the person's saved environments. */
export function VisualLookPicker({
  style,
  environment,
  onChange,
  only,
}: {
  only?: "style" | "environment";
  style: string;
  environment: string;
  onChange: (patch: { visualStyle?: string; environment?: string }) => void;
}) {
  const library = useLibrary();
  const saved = library.status === "ready" ? library.assets.filter((asset) => asset.kind === "environment") : [];

  const environments = [
    ...saved.map((asset) => ({
      value: asset.label,
      label: asset.label,
      hint: "One of your saved places",
      art:
        asset.file_kind === "image" && asset.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        ) : null,
    })),
    ...ENVIRONMENT_CARDS,
  ];

  return (
    <div className="flex flex-col gap-5">
      {only === "environment" ? null : (
        <LookCards
          label="Visual style"
          cards={STYLE_CARDS}
          value={style}
          onChange={(visualStyle) => onChange({ visualStyle })}
          customPlaceholder="Describe the look, e.g. pastel and dreamy"
        />
      )}
      {only === "style" ? null : (
        <LookCards
          label="Environment"
          cards={environments}
          value={environment}
          onChange={(next) => onChange({ environment: next })}
          customPlaceholder="Where does it happen? e.g. a rooftop at sunset"
          note={
            <>
              {saved.length > 0 ? "Your saved places come first. " : "Want your own place? "}
              <Link href="/dashboard/assets" className="text-primary underline underline-offset-2">
                Add one in Assets
              </Link>
            </>
          }
        />
      )}
    </div>
  );
}
