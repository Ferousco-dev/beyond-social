"use client";

import { useCallback, useEffect, useState } from "react";

import { type PendingVoice } from "@/features/dashboard/hooks/use-voice-upload";

import { getVoiceProfile, type VoiceProfile } from "./actions";

export function useSavedVoice() {
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getVoiceProfile().then((result) => {
      if (cancelled) return;
      setProfile(result.status === "ok" ? result.profile : null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const toPendingVoice = useCallback((): PendingVoice | null => {
    if (!profile?.url) return null;
    return {
      url: profile.url,
      path: profile.storagePath,
      name: "Saved voice",
    };
  }, [profile]);

  return { profile, loading, toPendingVoice };
}
