"use client";

import { useEffect, useRef } from "react";

import { env } from "@/lib/env";
import { jobSchema } from "./schemas";
import { createClient } from "@/lib/supabase/client";

import { toJobView, type JobView } from "./jobs";

const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 15_000;

/**
 * Live updates for one job over the Go API's WebSocket.
 *
 * The socket authenticates by sending the access token as its first message,
 * so the token never appears in a URL. After any reconnect `onResync` fires so
 * the caller can fetch the job over HTTP and recover whatever it missed while
 * disconnected. Returns nothing: `connected` is reported through `onConnection`.
 */
export function useJobSocket({
  jobId,
  active,
  onUpdate,
  onResync,
  onConnection,
}: {
  jobId: string | null;
  active: boolean;
  onUpdate: (job: JobView) => void;
  onResync: () => void;
  onConnection: (connected: boolean) => void;
}): void {
  // Latest callbacks without re-opening the socket when they change identity.
  const handlers = useRef({ onUpdate, onResync, onConnection });
  useEffect(() => {
    handlers.current = { onUpdate, onResync, onConnection };
  });

  useEffect(() => {
    const url = socketUrl();
    if (!jobId || !active || url === "") return;

    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let delay = RECONNECT_MIN_MS;
    let disposed = false;

    const connect = async () => {
      const { data } = await createClient().auth.getSession();
      if (disposed || !data.session) return;

      socket = new WebSocket(url);
      socket.onopen = () => {
        socket?.send(JSON.stringify({ type: "auth", token: data.session?.access_token }));
      };
      socket.onmessage = (message: MessageEvent<string>) => {
        const event = parseEvent(message.data);
        if (event === null) return;
        if (event.type === "connection.ready") {
          delay = RECONNECT_MIN_MS;
          handlers.current.onConnection(true);
          handlers.current.onResync();
        } else if (event.type.startsWith("job.") && event.resourceId === jobId && event.job) {
          handlers.current.onUpdate(event.job);
        }
      };
      socket.onclose = () => {
        handlers.current.onConnection(false);
        if (disposed) return;
        retry = setTimeout(() => void connect(), delay);
        delay = Math.min(delay * 2, RECONNECT_MAX_MS);
      };
    };

    void connect();
    return () => {
      disposed = true;
      clearTimeout(retry);
      handlers.current.onConnection(false);
      socket?.close();
    };
  }, [jobId, active]);
}

function parseEvent(raw: string): { type: string; resourceId: string; job: JobView | null } | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { type, resource_id: resourceId, payload } = value as Record<string, unknown>;
    if (typeof type !== "string" || typeof resourceId !== "string") return null;
    const job = jobSchema.safeParse(payload);
    return { type, resourceId, job: job.success ? toJobView(job.data) : null };
  } catch {
    return null;
  }
}

/** The API's WebSocket endpoint, derived from its base URL. */
function socketUrl(): string {
  const base = env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  return base === "" ? "" : `${base.replace(/^http/, "ws")}/ws`;
}
