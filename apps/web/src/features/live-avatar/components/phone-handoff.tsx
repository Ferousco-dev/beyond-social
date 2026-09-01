"use client";

import { Check, Copy, Smartphone } from "lucide-react";
import QRCode from "qrcode";
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

/**
 * The QR as inline SVG, encoded in the browser.
 *
 * Encoded here rather than fetched from an image endpoint because the thing
 * being encoded is a short-lived capability: sending it to a third-party chart
 * service to be drawn would hand that service the token, and generating it
 * server-side would put a one-use secret in a cacheable response. SVG rather
 * than canvas so it stays sharp on the phone screen being pointed at it.
 *
 * Medium error correction is the deliberate middle: enough redundancy to
 * survive a camera at an angle without inflating the module count to the point
 * where the code needs a bigger box to stay scannable.
 */
function useQrSvg(url: string | null): string | null {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    if (url === null) {
      setSvg(null);
      return;
    }
    let live = true;
    void QRCode.toString(url, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 0,
      color: { dark: "#000000", light: "#00000000" },
    })
      .then((markup) => {
        if (live) setSvg(markup);
      })
      .catch(() => {
        // A missing QR is a degraded screen, not a broken one: the link and the
        // copy button below it are the same route by hand.
        if (live) setSvg(null);
      });
    return () => {
      live = false;
    };
  }, [url]);

  return svg;
}

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
  const qr = useQrSvg(url);

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
      <div className="flex aspect-square w-full max-w-[280px] items-center justify-center rounded-lg border border-hairline bg-paper p-4 text-center">
        {qr !== null && !expired ? (
          <div
            aria-label="QR code linking to the recording page"
            role="img"
            className="size-full [&>svg]:size-full"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
        ) : (
          <p className="text-sm text-ink-soft">
            <Smartphone className="mx-auto mb-2 size-6" aria-hidden />
            {url === null
              ? "A phone link appears here once recording handoff is switched on."
              : "This code has expired. Get a new link to carry on."}
          </p>
        )}
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
