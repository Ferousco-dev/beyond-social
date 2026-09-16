import { type Metadata } from "next";

import { ConversationThread } from "@/features/dashboard/components/conversation-thread";
import { getVoiceProfile } from "@/features/voice/actions";
import { getBrandLibrary } from "@/lib/assets/brand";
import { getThread } from "@/lib/chat/thread";

export const metadata: Metadata = { title: "Project" };
// The thread is per-user and changes on every turn, so it is never cached.
export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  /*
   * The saved likeness rides along so a voice clip on its own can still become
   * an avatar. Somebody who has saved their face once should not have to attach
   * it again every time they attach a voice, and without it that turn generates
   * a video their voice is absent from.
   */
  const [thread, library, voice] = await Promise.all([
    getThread(id),
    getBrandLibrary(),
    getVoiceProfile(),
  ]);
  const avatar = library.avatar;
  const clonedVoiceId =
    voice.status === "ok" && voice.profile.cloneStatus === "ready"
      ? voice.profile.providerVoiceId
      : null;

  return (
    <ConversationThread
      thread={thread}
      savedLikeness={avatar?.url ? { path: avatar.path, url: avatar.url } : null}
      clonedVoiceId={clonedVoiceId}
    />
  );
}
