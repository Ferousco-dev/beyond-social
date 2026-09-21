import { type Metadata } from "next";
import Link from "next/link";

import { AvatarGrid } from "@/features/live-avatar/components/avatar-grid";
import { listTwins } from "@/features/live-avatar/delete-actions";
import { createClient } from "@/lib/supabase/server";
import { isFlagEnabled } from "@/lib/flags";

export const metadata: Metadata = { title: "Create your avatar" };
export const dynamic = "force-dynamic";

/**
 * The Live entry point: recording yourself once so every later video can be
 * made in your own face and voice.
 *
 * A page rather than a dialog, unlike the still-photo capture in the composer.
 * This asks somebody to read a consent statement aloud, talk for a while, and
 * hold still, which is a minute of deliberate work and the beginning of a
 * persistent likeness. A modal over a half-finished project frames that as an
 * interruption to something else; it is its own thing.
 *
 * See docs/live-avatar/DESIGN.md. Renders the same `AvatarGrid` the assets
 * page does rather than its own copy: this page used to keep a parallel
 * implementation (`CreateTwinEntry`) that had drifted out of sync with every
 * fix made to the other one, including a missing consent step, a client-side
 * placeholder id that never became the real one, and a status poll that could
 * overwrite an unrelated pending avatar. One implementation is what makes
 * "fixed here" mean fixed everywhere it is used.
 */
export default async function CreateAvatarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The name is read here only so the consent line can be spoken in the first
  // person. An account with no name still records; the statement opens neutrally.
  const metadataName = user?.user_metadata?.full_name;
  const name = typeof metadataName === "string" ? metadataName : "";

  const [twins, customAvatarEnabled] = await Promise.all([
    listTwins(),
    isFlagEnabled("heygen_custom_avatars", false),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <Link
          href="/dashboard/assets"
          className="text-sm font-medium text-primary underline underline-offset-4 hover:opacity-80"
        >
          ← Back to avatars
        </Link>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">
          Add a new avatar
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Record the consent and training footage once, then reuse your avatar in future videos.
        </p>
      </header>

      <AvatarGrid
        name={name}
        twins={twins}
        customAvatarEnabled={customAvatarEnabled}
        startInWizard
      />
    </div>
  );
}
