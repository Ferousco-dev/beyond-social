import { type Metadata } from "next";
import { type ReactNode } from "react";

import { listLibraryAssets, listLibraryGroups } from "@/features/asset-library/actions";
import { AssetLibrary } from "@/features/asset-library/components/asset-library";
import { ContinueDraft } from "@/features/generate-form/continue-draft";

export const metadata: Metadata = { title: "Assets" };
export const dynamic = "force-dynamic";

/**
 * The asset library: faces, voices, products, places and music, each its own
 * item, grouped by person or product so a video can take a whole group at once.
 */
export default async function AssetsPage(): Promise<ReactNode> {
  const [library, groups] = await Promise.all([listLibraryAssets(), listLibraryGroups()]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">Assets</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          Faces, voices, products and places. Group them by person or product, then pick a whole group when you make a
          video.
        </p>
      </header>
      <ContinueDraft variant="assets" />

      {library.status !== "ok" ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {library.status === "unconfigured" ? "The service is not available right now. Try again in a few minutes." : library.message}
        </p>
      ) : (
        <AssetLibrary initial={library.assets} initialGroups={groups} />
      )}
    </div>
  );
}
