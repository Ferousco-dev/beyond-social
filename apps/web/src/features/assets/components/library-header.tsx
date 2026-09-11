import { type ReactNode } from "react";

/**
 * The top of the creative library.
 *
 * Short by design. This page's job is holding assets, so the header should get
 * out of the way and let the panels do the work. The two-button header this
 * replaced was 200 pixels of vertical space repeating what the panels below
 * already offered: "Record your avatar" also sits inside the Digital twin
 * panel, and "Add a product photo" only reaches an anchor that scrolls to a
 * card whose own button does the actual work. Two of the same button, one of
 * them dishonest.
 *
 * `assetCount` is displayed only when there is one, because a "0 assets" chip
 * on an empty page reads as failure.
 */
export function LibraryHeader({ assetCount }: { assetCount: number }): ReactNode {
  return (
    <header className="pb-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">
          Your creative library
        </h1>
        {assetCount > 0 ? (
          <span className="text-sm tabular-nums text-ink-soft">
            {assetCount} {assetCount === 1 ? "asset" : "assets"}
          </span>
        ) : null}
      </div>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
        Save the people, products and recordings your videos should be built from.
      </p>
    </header>
  );
}
