"use client";

import { useEffect, useRef } from "react";

import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 15_000;

export interface SocketEvent {
  readonly type: string;
  readonly resourceId: string;
  readonly payload: unknown;
}

/**
 * The signed-in user's live events from the Go API.
 *
 * The socket authenticates with the access token as its first message, so the
 * token never appears in a URL. `onReady` fires on every (re)connection: events
 * sent while disconnected are gone, so callers use it to refetch what they show.
 */
export function useEventSocket({
  active,
  onEvent,
  onReady,
}: {
  readonly active: boolean;
  readonly onEvent: (event: SocketEvent) => void;
  readonly onReady: () => void;
}): void {
  // Latest callbacks without re-opening the socket when their identity changes.
  const handlers = useRef({ onEvent, onReady });
  useEffect(() => {
    handlers.current = { onEvent, onReady };
  });

  useEffect(() => {
    const base = env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
    if (!active || base === "") return;

    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let delay = RECONNECT_MIN_MS;
    let disposed = false;

    const connect = async (): Promise<void> => {
      const { data } = await createClient().auth.getSession();
      if (disposed || !data.session) return;

      socket = new WebSocket(`${base.replace(/^http/, "ws")}/ws`);
      socket.onopen = () => {
        socket?.send(JSON.stringify({ type: "auth", token: data.session?.access_token }));
      };
      socket.onmessage = (message: MessageEvent<string>) => {
        const event = parse(message.data);
        if (event === null) return;
        if (event.type === "connection.ready") {
          delay = RECONNECT_MIN_MS;
          handlers.current.onReady();
        } else {
          handlers.current.onEvent(event);
        }
      };
      socket.onclose = () => {
        if (disposed) return;
        retry = setTimeout(() => void connect(), delay);
        delay = Math.min(delay * 2, RECONNECT_MAX_MS);
      };
    };

    void connect();
    return () => {
      disposed = true;
      clearTimeout(retry);
      socket?.close();
    };
  }, [active]);
}

function parse(raw: string): SocketEvent | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { type, resource_id: resourceId, payload } = value as Record<string, unknown>;
    if (typeof type !== "string") return null;
    return { type, resourceId: typeof resourceId === "string" ? resourceId : "", payload };
  } catch {
    return null;
  }
}
