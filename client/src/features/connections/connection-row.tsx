"use client";

import { useOptimistic, useState, useTransition, type ReactNode } from "react";

import { PlatformLogo } from "@/components/brand/platform-logo";
import { Button } from "@/components/ui/button";
import { type SocialStatus } from "@/lib/go-api/schemas";

import { disconnect, startConnect } from "./actions";

export function ConnectionRow({ status }: { readonly status: SocialStatus }): ReactNode {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Disconnecting shows at once and undoes itself if the server refuses.
  const [connected, setConnected] = useOptimistic(status.connected);

  const connect = (): void =>
    startTransition(async () => {
      setError(null);
      const result = await startConnect(status.platform);
      if (result.status === "ok") window.location.assign(result.url);
      else setError(result.message);
    });

  const remove = (): void =>
    startTransition(async () => {
      setError(null);
      setConnected(false);
      const result = await disconnect(status.platform);
      if (!result.ok) setError(result.message ?? "Could not disconnect.");
    });

  const blurb = connected
    ? status.needs_reconnect
      ? "Sign in again to keep posting"
      : (status.account_name ?? "Connected")
    : status.available
      ? "Not connected"
      : "Not available yet";

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-cloud">
          <PlatformLogo platform={status.platform} colour={status.platform !== "tiktok"} className={status.platform === "tiktok" ? "text-ink" : undefined} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{status.label}</p>
          <p className="truncate text-xs text-ink-soft">{blurb}</p>
          {error ? (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex gap-2">
        {connected && !status.needs_reconnect ? null : (
          <Button disabled={pending || !status.available} onClick={connect}>
            {connected ? "Sign in again" : "Connect"}
          </Button>
        )}
        {connected ? (
          <Button variant="outline" disabled={pending} onClick={remove}>
            Disconnect
          </Button>
        ) : null}
      </div>
    </li>
  );
}
