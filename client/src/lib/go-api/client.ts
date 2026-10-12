import "server-only";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Calling the Go API from a server action.
 *
 * The caller's own Supabase access token is forwarded, so the Go service
 * authenticates the real user and enforces ownership itself. This module never
 * decides who someone is, and the token never reaches the browser.
 */

const TIMEOUT_MS = 20_000;

export const isGoApiConfigured = (): boolean => env.NEXT_PUBLIC_API_URL !== "";

export type GoApiResult<T> =
  | { readonly ok: true; readonly status: number; readonly data: T }
  | { readonly ok: false; readonly status: number; readonly code: string; readonly message: string };

const errorBodySchema = z.object({ error: z.object({ code: z.string(), message: z.string() }) });

interface RequestOptions {
  readonly method?: "GET" | "POST" | "DELETE";
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
}

/** Sends one request and validates the response against `schema`. */
export async function goApi<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<GoApiResult<T>> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return failure(401, "unauthorized", "Sign in to continue.");

  try {
    const response = await fetch(`${apiBase()}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const parsed = errorBodySchema.safeParse(payload);
      return parsed.success
        ? failure(response.status, parsed.data.error.code, parsed.data.error.message)
        : failure(response.status, "error", "The request failed.");
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      logger.error("go api response did not match the expected shape", { path });
      return failure(502, "bad_response", "The server sent something unexpected.");
    }
    return { ok: true, status: response.status, data: parsed.data };
  } catch (error) {
    logger.error("go api request failed", {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    return failure(503, "unavailable", "Could not reach the server just now.");
  }
}

function apiBase(): string {
  return env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
}

function failure(status: number, code: string, message: string): GoApiResult<never> {
  return { ok: false, status, code, message };
}
