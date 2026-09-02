/**
 * CORS for the edge functions.
 *
 * These all answered `Access-Control-Allow-Origin: *`, including the ones that
 * mutate on behalf of a signed-in user. That is wider than it needs to be: a
 * bearer token lifted out of a browser becomes usable from any page on the
 * internet, and origin is one of the few containment signals left once a token
 * has escaped. It is defence in depth rather than the lock itself, since a
 * server-side attacker was never bound by CORS at all.
 *
 * The allowlist is configuration, not hostnames in this file: `APP_ORIGIN` and
 * `ADMIN_ORIGIN` are the app's own addresses, and local development origins are
 * always allowed so the loopback case needs no setup.
 *
 * With neither variable set the behaviour is unchanged, `*` and no `Vary`. That
 * is deliberate: an allowlist that defaults to the empty set would break every
 * browser call the moment this deploys, and the switch belongs to whoever knows
 * the real origins.
 */

const LOCAL_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];

const BASE_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Configured origins, normalised to scheme plus host so a trailing slash or a
 *  stray path in the environment does not silently stop matching. */
function allowlist(): string[] {
  const configured = [Deno.env.get("APP_ORIGIN"), Deno.env.get("ADMIN_ORIGIN")]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => {
      try {
        return [new URL(value).origin];
      } catch {
        return [];
      }
    });

  return configured.length > 0 ? [...configured, ...LOCAL_ORIGINS] : [];
}

export function corsHeaders(req: Request): Record<string, string> {
  const allowed = allowlist();
  // Unconfigured: the previous behaviour, so deploying this does not break
  // anything before the origins are known.
  if (allowed.length === 0) return { ...BASE_HEADERS, "Access-Control-Allow-Origin": "*" };

  const origin = req.headers.get("origin") ?? "";
  // `Vary: Origin` regardless of the outcome. Without it a cache can serve one
  // origin's allow header to another, which converts an allowlist back into `*`.
  if (!allowed.includes(origin)) return { ...BASE_HEADERS, Vary: "Origin" };

  return { ...BASE_HEADERS, "Access-Control-Allow-Origin": origin, Vary: "Origin" };
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Wraps a handler so every response carries the right CORS headers for the
 * request that produced it, and answers the preflight.
 *
 * A wrapper rather than a header argument threaded through `json`: the headers
 * now depend on the request, and there are around a hundred `json` call sites
 * across these functions. One that had not been updated would silently answer
 * without CORS, which is the failure mode most likely to survive review.
 */
export function serve(handler: (req: Request) => Promise<Response> | Response): void {
  Deno.serve(async (req) => {
    const headers = corsHeaders(req);
    if (req.method === "OPTIONS") return new Response("ok", { headers });

    const response = await handler(req);
    for (const [name, value] of Object.entries(headers)) {
      response.headers.set(name, value);
    }
    return response;
  });
}
