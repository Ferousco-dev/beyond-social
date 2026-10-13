"use client";

import { useCallback, useEffect, useState } from "react";

import { listTwins } from "../delete-actions";
import { mintHandoff } from "../handoff-actions";

const POLL_MS = 4_000;

export interface PhoneHandoffState {
  readonly url: string | null;
  readonly expiresAt: number | null;
  readonly refresh: () => void;
}

/**
 * The link behind the "record on your phone" QR code.
 *
 * Mints one while the phone route is open, and watches the avatar list: the API
 * registers the avatar itself when the phone finishes uploading, so a new row is
 * the signal that the recording arrived.
 */
export function usePhoneHandoff(active: boolean, onRecorded: () => void): PhoneHandoffState {
  const [link, setLink] = useState<{ url: string; expiresAt: number } | null>(null);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!active) return;
    let live = true;
    void Promise.all([mintHandoff(), listTwins()]).then(([minted, twins]) => {
      if (!live) return;
      setBaseline((current) => current ?? twins.length);
      if (minted.status === "ok") setLink({ url: minted.url, expiresAt: minted.expiresAt });
    });
    return () => {
      live = false;
    };
  }, [active, attempt]);

  useEffect(() => {
    if (!active || baseline === null) return;
    const timer = window.setInterval(() => {
      void listTwins().then((twins) => {
        if (twins.length > baseline) onRecorded();
      });
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [active, baseline, onRecorded]);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);
  return { url: link?.url ?? null, expiresAt: link?.expiresAt ?? null, refresh };
}
