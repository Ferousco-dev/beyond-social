import { type Metadata } from "next";
import { listTwins } from "@/features/live-avatar/delete-actions";
import { AvatarGrid } from "@/features/live-avatar/components/avatar-grid";
import { AvatarVideoPanel } from "@/features/live-avatar/components/avatar-video-panel";
import { getVoiceProfile } from "@/features/voice/actions";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { enrollmentPhrase } from "@/lib/voice/phrase";

export const metadata: Metadata = { title: "Assets" };
export const dynamic = "force-dynamic";

/**
 * Recording and managing avatars, not generating from them.
 *
 * A "write what it should say" panel used to live here too, but it was a
 * second way to do exactly what the composer's own avatar picker already
 * does (both call `makeTwinVideo`), and having two made it unclear where a
 * video actually starts from. Generating now happens in one place: the
 * composer, once an avatar is picked there.
 */
export default async function AssetsPage() {
  const [user, voice, twins] = await Promise.all([
    getCurrentUser(),
    getVoiceProfile(),
    listTwins(),
  ]);
  const voiceProfile = voice.status === "ok" ? voice.profile : null;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="pb-8">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">
          Your avatar
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          Record yourself once. From then on, pick it in the composer and write anything: your
          avatar speaks it in your own voice, in a new video.
        </p>
      </header>

      <AvatarGrid
        twins={twins}
        name={user.email ?? "User"}
        voiceProfile={voiceProfile}
        voicePhrase={enrollmentPhrase(user.name)}
      />

      <AvatarVideoPanel twins={twins} />
    </div>
  );
}
