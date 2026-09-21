import { type Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { listTwins } from "@/features/live-avatar/delete-actions";
import { AvatarGrid } from "@/features/live-avatar/components/avatar-grid";
import { TwinSpeak } from "@/features/live-avatar/components/twin-speak";
import { twinVideoReadiness } from "@/features/live-avatar/video-actions";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { isFlagEnabled } from "@/lib/flags";

export const metadata: Metadata = { title: "Assets" };
export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const user = await getCurrentUser();
  const [twins, readiness, customAvatarEnabled] = await Promise.all([
    listTwins(),
    twinVideoReadiness(),
    isFlagEnabled("heygen_custom_avatars", false),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5 pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">
            Your avatar
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            Record yourself once. From then on, write anything and your avatar speaks it in your own
            voice, in a new video.
          </p>
        </div>
        <Link
          href="/dashboard/avatar/new"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-primary px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Plus className="size-4" aria-hidden />
          New avatar
        </Link>
      </header>

      {/*
       * One flow, not two unrelated cards: step 1 is record/pick an avatar,
       * step 2 is right underneath it because "it's ready" and "use it" used
       * to be separated by a whole section boundary, which read as two
       * different features rather than the next step of the same one.
       */}
      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            1. Record or choose an avatar
          </h2>
          <AvatarGrid
            twins={twins}
            name={user.email ?? "User"}
            customAvatarEnabled={customAvatarEnabled}
          />
        </section>

        {/* TwinSpeak renders nothing with no avatar recorded yet, so this
            section would otherwise be a labelled empty box: the library
            above is already telling that person to record one. */}
        {twins.length > 0 && (
          <section className="rounded-2xl border border-hairline bg-paper p-6 md:p-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-2">
              2. Write what it should say
            </h2>
            <TwinSpeak twins={twins} readiness={readiness} />
          </section>
        )}
      </div>
    </div>
  );
}
