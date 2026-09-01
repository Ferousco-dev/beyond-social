import { type Metadata } from "next";

import { CreateTwinEntry } from "@/features/live-avatar/components/create-twin-entry";
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
 * See docs/live-avatar/DESIGN.md. Training is deliberately not wired here:
 * this screen produces footage and consent, and the provider step lives behind
 * its own guard until credentials exist.
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

  return <CreateTwinEntry name={name} />;
}
