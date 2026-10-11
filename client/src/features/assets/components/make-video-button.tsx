"use client";

import { Clapperboard } from "lucide-react";
import { useRouter } from "next/navigation";

import { type BrandAsset } from "@/lib/assets/brand";
import { leaveSeed } from "@/lib/composer/seed";
import { cn } from "@/lib/utils";

/**
 * Starting a video from a picture that is already saved.
 *
 * The pipeline has been able to do this since products were added: attach the
 * photo, and the turn recognises it as a saved subject and tells the generator
 * to feature that exact object rather than something like it. What it had no
 * way of being asked was here. The picture sat on a shelf with a delete button
 * next to it and nothing else, so the only route to a product video was to know
 * to open a new thread and go looking through the plus menu.
 *
 * Nothing is sent. The composer is filled with the picture attached and a first
 * line to edit, because a render costs money.
 */

/** Enough to direct a first pass, and short enough that editing it is easy. */
function openingLine(asset: BrandAsset): string {
  if (asset.kind === "avatar") {
    return "A short vertical video of me talking to camera, filmed like a phone selfie in natural light.";
  }

  const named = asset.label.trim();
  return `A short vertical video featuring ${named === "" ? "this product" : named}, shown close up and in use.`;
}

export function MakeVideoButton({
  asset,
  className,
  children,
}: {
  asset: BrandAsset;
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      // A picture that could not be signed has no URL for the composer to show,
      // and re-signing it is the page's job on its next read, not this button's.
      disabled={asset.url === null}
      onClick={() => {
        if (asset.url === null) return;
        leaveSeed({
          prompt: openingLine(asset),
          photos: [{ id: asset.id, url: asset.url, path: asset.path }],
        });
        router.push("/dashboard/c/new");
      }}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      <Clapperboard className="size-3.5" aria-hidden />
      {children ?? "Make a video"}
    </button>
  );
}
