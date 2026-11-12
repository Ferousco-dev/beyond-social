import { type Metadata } from "next";
import { type ReactNode } from "react";

import { listAssetGroups } from "@/features/asset-groups/actions";
import { AvatarGroups } from "@/features/asset-groups/components/avatar-groups";
import { listLibraryAssets } from "@/features/asset-library/actions";
import { AssetLibrary } from "@/features/asset-library/components/asset-library";

export const metadata: Metadata = { title: "Assets" };
export const dynamic = "force-dynamic";

/**
 * The asset library: faces, voices, products, environments and anything else,
 * each its own item, so any of them can be picked for a video.
 */
export default async function AssetsPage(): Promise<ReactNode> {
  const [library, groups] = await Promise.all([listLibraryAssets(), listAssetGroups()]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">Assets</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          Faces, voices, products and places, each kept on its own. Label them clearly, then pick any of them when you
          make a video.
        </p>
      </header>

      {library.status !== "ok" ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {library.status === "unconfigured" ? "The service is not available right now. Try again in a few minutes." : library.message}
        </p>
      ) : (
        <AssetLibrary initial={library.assets} />
      )}

      {groups.status === "ok" ? (
        <section aria-labelledby="groups-heading" className="mt-14 border-t border-hairline pt-6">
          <h2 id="groups-heading" className="text-sm font-semibold text-ink">
            Avatar groups
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-soft">
            Optional. Live avatar videos still read a face and voice from a group for now; files in groups you made
            before are already in your library above.
          </p>
          <AvatarGroups initial={groups.groups} />
        </section>
      ) : null}
    </div>
  );
}
