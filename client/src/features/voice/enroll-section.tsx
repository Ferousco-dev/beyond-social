import { getCurrentUser } from "@/lib/dashboard/current-user";
import { enrollmentPhrase } from "@/lib/voice/phrase";

import { getVoiceProfile } from "./actions";
import { EnrollCard } from "./enroll-card";

export async function EnrollSection() {
  const [result, user] = await Promise.all([getVoiceProfile(), getCurrentUser()]);
  const profile = result.status === "ok" ? result.profile : null;

  // Built on the server so the card renders the same wording it submits, and so
  // the name comes from the session rather than from anything the client holds.
  return <EnrollCard initial={profile} phrase={enrollmentPhrase(user.name)} />;
}
