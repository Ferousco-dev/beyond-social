"use client";

import { useState } from "react";

import { type SocialConnection } from "@/lib/social/connections";

import { ConnectionRow } from "./connection-row";

/** Outcomes the OAuth callback can redirect back with. */
const STATUS_MESSAGES: Readonly<Record<string, string>> = {
  connected: "Account connected.",
  cancelled: "Connection cancelled.",
  failed: "That connection could not be completed. Please try again.",
  invalid_state: "That sign-in link expired. Please try connecting again.",
  unknown: "That platform is not available.",
};

export function ConnectionList({
  connections,
  status,
}: {
  connections: readonly SocialConnection[];
  status?: string;
}) {
  const [message, setMessage] = useState<string | null>(
    status ? (STATUS_MESSAGES[status] ?? null) : null,
  );

  return (
    <>
      <ul className="space-y-3">
        {connections.map((connection) => (
          <ConnectionRow key={connection.platform} connection={connection} onMessage={setMessage} />
        ))}
      </ul>

      {message ? (
        <p role="status" className="mt-3 text-xs text-ink-soft">
          {message}
        </p>
      ) : null}
    </>
  );
}
