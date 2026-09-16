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
          Your avatar
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          Record yourself once. From then on, write anything and your avatar speaks it in your own
          voice, in a new video.
        </p>
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
          <AvatarGrid twins={twins} name={user.email ?? "User"} />
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
