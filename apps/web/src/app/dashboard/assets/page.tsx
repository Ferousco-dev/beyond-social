import { type Metadata } from "next";

import { listTwins } from "@/features/live-avatar/delete-actions";
import { AvatarGrid } from "@/features/live-avatar/components/avatar-grid";
import { TwinSpeak } from "@/features/live-avatar/components/twin-speak";
import { twinVideoReadiness } from "@/features/live-avatar/video-actions";
import { getCurrentUser } from "@/lib/dashboard/current-user";

export const metadata: Metadata = { title: "Assets" };
export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const user = await getCurrentUser();
  const [twins, readiness] = await Promise.all([listTwins(), twinVideoReadiness()]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="pb-8">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">
          Your avatars
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          Record yourself once and use your avatar in every video.
        </p>
      </header>

      <div className="space-y-8">
        <AvatarGrid twins={twins} name={user.email ?? "User"} />
        <TwinSpeak twins={twins} readiness={readiness} />
      </div>
    </div>
  );
}
