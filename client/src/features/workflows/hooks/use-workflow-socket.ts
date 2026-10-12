"use client";

import { useEffect, useRef } from "react";

import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 15_000;

/**
 * Live workflow events over the Go API's WebSocket.
 *
 * Any `workflow.*` event for this workflow triggers a refetch, so the panel
 * replays from HTTP state rather than trusting the event payload. Reconnects
 * resync the same way. Mirrors use-job-socket without its job payload parsing.
 */
export function useWorkflowSocket({
  workflowId,
  active,
  onUpdate,
  onConnection,
}: {
  workflowId: string | null;
  active: boolean;
  onUpdate: () => void;
  onConnection: (connected: boolean) => void;
}): void {
  const handlers = useRef({ onUpdate, onConnection });
  useEffect(() => {
    handlers.current = { onUpdate, onConnection };
  });

  useEffect(() => {
    const base = env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
    if (!workflowId || !active || base === "") return;

    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let delay = RECONNECT_MIN_MS;
    let disposed = false;

    const connect = async () => {
      const { data } = await createClient().auth.getSession();
      if (disposed || !data.session) return;

      socket = new WebSocket(`${base.replace(/^http/, "ws")}/ws`);
      socket.onopen = () => {
        socket?.send(JSON.stringify({ type: "auth", token: data.session?.access_token }));
      };
      socket.onmessage = (message: MessageEvent<string>) => {
        const event = parseEvent(message.data);
        if (event === null) return;
        if (event.type === "connection.ready") {
          delay = RECONNECT_MIN_MS;
          handlers.current.onConnection(true);
          handlers.current.onUpdate();
        } else if (event.type.startsWith("workflow.") && event.resourceId === workflowId) {
          handlers.current.onUpdate();
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
  }, [workflowId, active]);
}

function parseEvent(raw: string): { type: string; resourceId: string } | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { type, resource_id: resourceId } = value as Record<string, unknown>;
    if (typeof type !== "string" || typeof resourceId !== "string") return null;
    return { type, resourceId };
  } catch {
    return null;
  }
}
