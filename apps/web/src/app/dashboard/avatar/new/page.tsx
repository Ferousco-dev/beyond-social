import { type Metadata } from "next";

import { AvatarGrid } from "@/features/live-avatar/components/avatar-grid";
import { listTwins } from "@/features/live-avatar/delete-actions";
import { createClient } from "@/lib/supabase/server";

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

  const twins = await listTwins();

  return <AvatarGrid name={name} twins={twins} />;
}
