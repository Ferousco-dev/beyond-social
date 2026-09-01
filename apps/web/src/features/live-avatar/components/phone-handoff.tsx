"use client";

import { Check, Copy, Smartphone } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Continuing the recording on a phone.
 *
 * The reason this route exists is not convenience. A laptop webcam is usually
 * a 720p sensor pointed slightly up at someone under a ceiling light, and the
 * phone in the same room has a far better camera and a microphone closer to
 * the mouth. For footage that becomes a permanent likeness, that difference
 * outlives the recording.
 *
 * The link is short-lived on purpose: it grants the right to attach footage to
 * one person's avatar, so it is a capability, and a capability that does not
 * expire is a credential. Twenty minutes is long enough to walk to better
 * light and short enough that a screenshot of the QR is worthless tomorrow.
 */

/** Matches the expiry the handoff token itself is minted with. */
export const HANDOFF_MINUTES = 20;

function countdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function PhoneHandoff({
  url,
  expiresAt,
  onRefresh,
}: {
  /** Null while no handoff has been minted, which is also the unconfigured case. */
  url: string | null;
  expiresAt: number | null;
  onRefresh: () => void;
}): ReactNode {
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const expired = expiresAt !== null && now >= expiresAt;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border border-hairline bg-cloud/50 p-5">
      <div className="flex aspect-square w-full max-w-[280px] items-center justify-center rounded-lg border border-dashed border-hairline bg-paper p-6 text-center">
        {/*
         * The QR itself is the one piece of this screen that is not here yet.
         * Rendering one needs an encoder, and adding a dependency is the
         * owner's call, so the link below is the working route in the meantime
         * rather than a picture of a route that does not resolve.
         */}
        <p className="text-sm text-ink-soft">
          <Smartphone className="mx-auto mb-2 size-6" aria-hidden />
          {url === null
            ? "A phone link appears here once recording handoff is switched on."
            : "Scan or open the link below on your phone."}
        </p>
      </div>

      {url !== null ? (
        <>
          <div className="flex w-full items-center gap-2 rounded-lg border border-hairline bg-paper px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm text-ink-soft" title={url}>
              {url}
            </span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(url).then(() => setCopied(true));
              }}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {copied ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <p className="text-sm text-ink-soft" aria-live="polite">
            {expired ? (
              "This link has expired."
            ) : (
              <>
                Link expires in{" "}
                <span className="font-medium text-primary">
                  {countdown((expiresAt ?? now) - now)}
                </span>
              </>
            )}
          </p>
        </>
      ) : null}

      <button
        type="button"
        onClick={onRefresh}
        className="cursor-pointer text-sm text-ink underline underline-offset-4 transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {expired || url === null ? "Get a new link" : "Refresh now"}
      </button>
    </div>
  );
}
