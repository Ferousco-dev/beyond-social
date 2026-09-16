import { useCallback, useEffect, useState } from "react";

import { listTwins, type TwinSummary } from "../delete-actions";
import { refreshHostedConsent } from "../upload-actions";

/** How often a pending avatar is checked while training/consent is in flight. */
const POLL_MS = 4000;

/**
 * Keeps an avatar list in sync with the server: on prop changes (a
 * `router.refresh()` landing), on an interval while anything is pending, and
 * on demand. Always replaces the whole array from `listTwins()` rather than
 * patching one field on every pending row — a patch keyed off "whatever the
 * latest status check returned" cannot tell two pending avatars apart and
 * silently overwrites one with the other's state.
 */
export function useTwinStatus(initialTwins: readonly TwinSummary[]): {
  avatars: readonly TwinSummary[];
  setAvatars: React.Dispatch<React.SetStateAction<readonly TwinSummary[]>>;
  checkStatus: () => Promise<void>;
  refreshConsent: (
    avatarId: string,
  ) => Promise<{ status: "ok" } | { status: "error"; message: string }>;
} {
  const [avatars, setAvatars] = useState(initialTwins);

  // Local state exists only so a newly recorded avatar can appear before the
  // server round trip that would otherwise be the only way to see it. Once
  // that trip completes (a router.refresh() elsewhere), the real row arrives
  // here with its real id, replacing whatever placeholder stood in for it.
  useEffect(() => {
    setAvatars(initialTwins);
  }, [initialTwins]);

  useEffect(() => {
    if (!avatars.some((a) => a.trainingStatus === "pending")) return;

    let cancelled = false;
    const timer = window.setInterval(() => {
      void listTwins().then((fresh) => {
        if (!cancelled) setAvatars(fresh);
      });
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [avatars]);

  const checkStatus = useCallback(async () => {
    const fresh = await listTwins();
    setAvatars(fresh);
  }, []);

  const refreshConsent = useCallback(async (avatarId: string) => {
    const result = await refreshHostedConsent(avatarId);
    if (result.status === "ok") {
      setAvatars((current) =>
        current.map((a) =>
          a.id === avatarId ? { ...a, consentUrl: result.consentUrl, consentUrlExpired: false } : a,
        ),
      );
    }
    return result;
  }, []);

  return { avatars, setAvatars, checkStatus, refreshConsent };
}
