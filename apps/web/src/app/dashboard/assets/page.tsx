import { type Metadata } from "next";

import { listTwins } from "@/features/live-avatar/delete-actions";
import { AvatarGrid } from "@/features/live-avatar/components/avatar-grid";
import { getCurrentUser } from "@/lib/dashboard/current-user";

export const metadata: Metadata = { title: "Assets" };
export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const user = await getCurrentUser();
  const twins = await listTwins();

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

      <AvatarGrid twins={twins} name={user.email ?? "User"} />
    </div>
  );
}
