"use client";

import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

/** A safety check in case a push is missed, for example while the socket reconnects. */
const BACKSTOP_MS = 15_000;

interface Options<T> {
  readonly jobId: string;
  /** Reads the job's current state from the API. */
  readonly check: () => Promise<T>;
  readonly isDone: (state: T) => boolean;
  readonly timeoutMs: number;
  /** False once the screen that asked has gone away. */
  readonly alive: () => boolean;
}

/**
 * Waits for a job without asking every few seconds. The API pushes a message
 * over its WebSocket when the job changes, and each message triggers one check.
 * A slow check runs as well, so a missed push only delays the answer. Resolves
 * with the final state, or null if the screen went away or the time ran out.
 */
export function waitForJob<T>({ jobId, check, isDone, timeoutMs, alive }: Options<T>): Promise<T | null> {
  return new Promise((resolve) => {
    let socket: WebSocket | null = null;
    let settled = false;
    const finish = (value: T | null): void => {
      if (settled) return;
      settled = true;
      clearInterval(backstop);
      clearTimeout(deadline);
      socket?.close();
      resolve(value);
    };
    const look = async (): Promise<void> => {
      if (settled) return;
      if (!alive()) return finish(null);
      try {
        const state = await check();
        if (isDone(state)) finish(state);
      } catch {
        // A failed look is retried by the next push or the backstop.
      }
    };
    const backstop = setInterval(() => void look(), BACKSTOP_MS);
    const deadline = setTimeout(() => finish(null), timeoutMs);

    const base = env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
    if (base === "") return;
    void createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (settled || !data.session) return;
        const token = data.session.access_token;
        socket = new WebSocket(`${base.replace(/^http/, "ws")}/ws`);
        socket.onopen = () => socket?.send(JSON.stringify({ type: "auth", token }));
        socket.onmessage = (message: MessageEvent<string>) => {
          try {
            const event = JSON.parse(message.data) as { type?: unknown; resource_id?: unknown };
            if (event.type === "connection.ready" || (typeof event.type === "string" && event.type.startsWith("job.") && event.resource_id === jobId)) {
              void look();
            }
          } catch {
            // Not an event we understand.
          }
        };
      });
    void look();
  });
}
