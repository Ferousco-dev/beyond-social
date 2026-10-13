"use client";

import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { type SocialStatus } from "@/lib/go-api/schemas";

import { disconnect, startConnect } from "./actions";

export function ConnectionRow({ status }: { readonly status: SocialStatus }): ReactNode {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
      const result = await disconnect(status.platform);
      if (!result.ok) setError(result.message ?? "Could not disconnect.");
    });

  const blurb = status.connected
    ? status.needs_reconnect
      ? "Sign in again to keep posting"
      : (status.account_name ?? "Connected")
    : status.available
      ? "Not connected"
      : "Not available yet";

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{status.label}</p>
        <p className="truncate text-xs text-ink-soft">{blurb}</p>
        {error ? (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">
        {status.connected && !status.needs_reconnect ? null : (
          <Button disabled={pending || !status.available} onClick={connect}>
            {status.connected ? "Sign in again" : "Connect"}
          </Button>
        )}
        {status.connected ? (
          <Button variant="outline" disabled={pending} onClick={remove}>
            Disconnect
          </Button>
        ) : null}
      </div>
    </li>
  );
}
