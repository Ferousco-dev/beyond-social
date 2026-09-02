import "server-only";

import { NextResponse } from "next/server";

import { INTEGRATIONS_DENIAL } from "@/lib/billing/integration-gate";

import { authenticateRequest, callerMayUseApi, type ApiCaller } from "./authenticate";
import { checkApiRateLimit } from "./rate-limit";

/**
 * The three checks every authenticated endpoint makes, in the order they have
 * to happen: who is calling, whether their plan includes this, and whether they
 * are calling too often.
 *
 * One helper rather than three copies per route. The copies were the same
 * eleven lines in each file, which is exactly the shape a check goes missing
 * from when a fourth endpoint is added in a hurry.
 */

export type Guarded =
  | { readonly ok: true; readonly caller: ApiCaller }
  | { readonly ok: false; readonly response: NextResponse };

export async function guardApiRequest(request: Request): Promise<Guarded> {
  const caller = await authenticateRequest(request);
  if (!caller) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unauthorized", message: "Provide a valid API key as a bearer token." },
        { status: 401 },
      ),
    };
  }

  // 403 rather than 401: the credential is fine, the plan is not, and the
  // remedy is an upgrade rather than a new key.
  if (!callerMayUseApi(caller)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "upgrade_required", message: INTEGRATIONS_DENIAL },
        { status: 403 },
      ),
    };
  }

  // Throttled per key, and across instances: an authenticated caller can still
  // exhaust the database, and a per-instance counter is no obstacle on serverless.
  const limit = await checkApiRateLimit(caller.userId);
  if (!limit.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "rate_limited", message: "Too many requests. Slow down." },
        { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
      ),
    };
  }

  return { ok: true, caller };
}
