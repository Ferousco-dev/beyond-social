import { type Metadata } from "next";

import { AvatarGrid } from "@/features/live-avatar/components/avatar-grid";
import { AvatarVideoPanel } from "@/features/live-avatar/components/avatar-video-panel";
import { listTwins } from "@/features/live-avatar/delete-actions";
import { AssetLibrary } from "@/features/library/asset-library";
import { getCurrentUser } from "@/lib/dashboard/current-user";

export const metadata: Metadata = { title: "Assets" };
export const dynamic = "force-dynamic";

/**
 * Account media and avatar management.
 */
export default async function AssetsPage() {
  const [user, twins] = await Promise.all([getCurrentUser(), listTwins()]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="pb-8">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">Assets</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          Manage the media and avatars you use while creating videos.
        </p>
      </header>

      <div className="space-y-8">
        <AssetLibrary />
        <section aria-labelledby="avatars-title">
          <h2 id="avatars-title" className="mb-4 text-xl font-semibold text-ink">Your avatars</h2>
          <AvatarGrid twins={twins} name={user.name} />

          <div className="mt-6">
            <AvatarVideoPanel twins={twins} />
          </div>
        </section>
      </div>
    </div>
  );
}
