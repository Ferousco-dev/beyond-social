import { type Metadata } from "next";

import { AvatarGrid } from "@/features/live-avatar/components/avatar-grid";
import { AvatarVideoPanel } from "@/features/live-avatar/components/avatar-video-panel";
import { listTwins } from "@/features/live-avatar/delete-actions";
import { getCurrentUser } from "@/lib/dashboard/current-user";

export const metadata: Metadata = { title: "Assets" };
export const dynamic = "force-dynamic";

/**
 * Recording and managing avatars, and making a video with one. Everything here
 * runs on the Go API.
 */
export default async function AssetsPage() {
  const [user, twins] = await Promise.all([getCurrentUser(), listTwins()]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="pb-8">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">
          Your avatar
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          Record yourself once. From then on, write anything and your avatar speaks it in your own
          voice, in a new video.
        </p>
      </header>

      <AvatarGrid twins={twins} name={user.name} />

      <AvatarVideoPanel twins={twins} />
    </div>
  );
}
