import { getVoiceProfile } from "./actions";
import { EnrollCard } from "./enroll-card";

export async function EnrollSection() {
  const result = await getVoiceProfile();
  const profile = result.status === "ok" ? result.profile : null;
  return <EnrollCard initial={profile} />;
}
