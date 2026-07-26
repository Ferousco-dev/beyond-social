"use client";

import { Check, Loader2 } from "lucide-react";
import { useTransition } from "react";

import { type SocialConnection } from "@/lib/social/connections";
import { cn } from "@/lib/utils";

import { disconnectPlatform } from "../actions";

/**
 * One platform. Renders three distinct states rather than collapsing them:
 * connected, connectable, and unavailable because the app credentials are not
 * set up yet. Hiding the last one would look like a missing feature.
 */
export function ConnectionRow({
  connection,
  onMessage,
}: {
  connection: SocialConnection;
  onMessage: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-paper p-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          {connection.label}
          {connection.connected ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-cloud px-2 py-0.5 text-[11px] font-medium text-ink-soft">
              <Check className="size-3 text-success" aria-hidden />
              Connected
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-soft">
          {!connection.available
            ? "Not available yet. This platform's app review is still pending."
            : connection.connected
              ? (connection.accountName ?? "") || "Connected account"
              : "Not connected"}
        </p>
      </div>

      {connection.connected ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await disconnectPlatform({ platform: connection.platform });
              if (result.status === "error") onMessage(result.message);
            });
          }}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-hairline px-3.5 text-xs font-medium text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          Disconnect
        </button>
      ) : (
        <a
          href={connection.available ? `/api/social/${connection.platform}/connect` : undefined}
          aria-disabled={!connection.available}
          className={cn(
            "inline-flex h-9 items-center rounded-full px-3.5 text-xs font-medium transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            connection.available
              ? "bg-ink text-canvas hover:opacity-90"
              : "pointer-events-none cursor-not-allowed border border-hairline text-ink-soft opacity-50",
          )}
        >
          Connect
        </a>
      )}
    </li>
  );
}
