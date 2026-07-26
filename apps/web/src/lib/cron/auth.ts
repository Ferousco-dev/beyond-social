import "server-only";

import { timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/lib/server-env";

/**
 * Shared secret check for scheduled jobs.
 *
 * Fails closed: with no secret configured nobody can trigger a job, because an
 * open endpoint that runs a scraping sweep or a bulk delete is a way for anyone
 * to spend our money or damage our data.
 *
 * Compared in constant time so the secret cannot be recovered a byte at a time.
 */
export function isCronAuthorised(request: Request): boolean {
  const expected = serverEnv.CRON_SECRET;
  if (expected === "") return false;

  const provided = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
