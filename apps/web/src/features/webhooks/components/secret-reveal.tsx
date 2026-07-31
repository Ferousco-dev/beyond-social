"use client";

import { TriangleAlert } from "lucide-react";

import { CopyButton } from "./copy-button";

/**
 * The one moment the signing secret exists in the interface.
 *
 * The wording is deliberately blunt and sits above the value rather than below
 * it. We store only a SHA-256 digest, so this is not a policy we could relax
 * later by adding a "show secret" button: the plaintext is genuinely gone once
 * this unmounts, and the only way back is rotation.
 */
export function SecretReveal({
  secret,
  onDismiss,
  rotated,
}: {
  secret: string;
  onDismiss: () => void;
  rotated: boolean;
}) {
  return (
    <div className="rounded-2xl border border-warning/40 bg-warning/5 p-5">
      <div className="flex items-start gap-2.5">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">
            Copy this signing secret now. It will not be shown again.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            We store only a hash of it, so we cannot show it to you a second time or recover it if
            you lose it. If that happens, rotate the secret to get a new one.
            {rotated ? " The previous secret stopped working the moment this one was created." : ""}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-hairline bg-canvas px-3 py-2.5 font-mono text-xs text-ink">
          {secret}
        </code>
        <CopyButton value={secret} label="Copy secret" />
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-11 shrink-0 items-center rounded-lg px-3 text-xs font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          I have saved it
        </button>
      </div>
    </div>
  );
}
