import { type Metadata } from "next";
import { type ReactNode } from "react";

import { listAssetGroups } from "@/features/asset-groups/actions";
import { GroupList } from "@/features/asset-groups/components/group-list";
import { NewGroupButton } from "@/features/asset-groups/components/new-group-button";

export const metadata: Metadata = { title: "Assets" };
export const dynamic = "force-dynamic";

/**
 * Asset groups: named bundles of face, voice, product and environment,
 * one per video concept. Pick one per video instead of re-uploading.
 */
export default async function AssetsPage(): Promise<ReactNode> {
  const result = await listAssetGroups();

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="pb-2">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">
          Asset groups
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          Each group holds a face, a voice, a product, and a setting, plus anything
          extra. Build one per concept, then choose it when you make a video.
        </p>
      </header>

      {result.status !== "ok" ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {result.status === "unconfigured" ? "The backend is not connected yet." : result.message}
        </p>
      ) : (
        <>
          <GroupList groups={result.groups} />
          <div className="mt-4">
            <NewGroupButton />
          </div>
        </>
      )}
    </div>
  );
}
