/**
 * End to end checks for the deleted-account lockout, against a real database.
 *
 * Nothing here is stubbed. A user is created through GoTrue, signed in for a
 * real session, and the real `updateSession` runs against the local Supabase.
 * Round trips are counted by wrapping `fetch`, so the cost of the deletion
 * check is measured rather than asserted.
 *
 *   supabase start && tsx --tsconfig scripts/tsconfig.json scripts/account-deletion-smoke.ts
 */
import { execFileSync } from "node:child_process";

/**
 * Credentials come from the running local stack, never from `apps/web/.env`.
 *
 * That file points at the hosted project, and this script creates users, signs
 * them in and flips `deleted_at`. Reading it would run all of that against real
 * accounts. The host is asserted below as well, so a misconfigured CLI cannot
 * quietly turn this into a live-fire test.
 */
const status = execFileSync("supabase", ["status", "-o", "env"], {
  cwd: new URL("../../../", import.meta.url).pathname,
  encoding: "utf8",
});
for (const line of status.split("\n")) {
  const match = /^([A-Z0-9_]+)="?([^"]*)"?$/.exec(line.trim());
  // Destructured rather than indexed: `noUncheckedIndexedAccess` types a capture
  // group as possibly undefined, and an undefined key cannot index process.env.
  const [, key, value] = match ?? [];
  if (key !== undefined) process.env[key] = value ?? "";
}

// The CLI still prints the legacy demo JWTs, which this stack no longer accepts.
const URL_BASE = process.env.API_URL ?? "";
const ANON = process.env.PUBLISHABLE_KEY ?? process.env.ANON_KEY ?? "";
const SERVICE = process.env.SECRET_KEY ?? process.env.SERVICE_ROLE_KEY ?? "";

if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(URL_BASE)) {
  throw new Error(`refusing to run against a non-local Supabase: ${URL_BASE || "(unset)"}`);
}

// The middleware reads this at module scope for the live-mark signing key, so it
// has to be set before the import below.
process.env.NEXT_PUBLIC_SUPABASE_URL = URL_BASE;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON;
process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE;

const { createServerClient } = await import("@supabase/ssr");
const { createClient } = await import("@supabase/supabase-js");
const { NextRequest } = await import("next/server");
const { updateSession, ACCOUNT_DELETED_PATH } = await import("../src/lib/supabase/middleware");

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
  if (!passed) failures += 1;
}

/** Counts the deletion probes the middleware actually puts on the wire. */
const realFetch = globalThis.fetch;
let rpcCalls = 0;
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (String(input instanceof Request ? input.url : input).includes("rpc/is_account_deleted")) {
    rpcCalls += 1;
  }
  return realFetch(input, init);
}) as typeof fetch;

const admin = createClient(URL_BASE, SERVICE, { auth: { persistSession: false } });
const email = `deletion-smoke-${Date.now()}@example.test`;
const password = "Sm0ke-Test-Password!";

/*
 * Created through the public signup endpoint rather than the admin API.
 *
 * GoTrue on this CLI version refuses admin calls made with either key the stack
 * prints: the legacy service-role JWT is rejected as "signing method HS256 is
 * invalid", and the new `sb_secret_` key is not accepted there either. Signup
 * and PostgREST both accept their respective keys, so the account is created the
 * way a real person creates one and confirmed with the service key afterwards.
 */
const signup = await createClient(URL_BASE, ANON, {
  auth: { persistSession: false },
}).auth.signUp({ email, password });
if (signup.error || !signup.data.user) throw new Error(`create user: ${signup.error?.message}`);
const userId = signup.data.user.id;

/*
 * Confirmed straight against the database.
 *
 * `enable_confirmations` is on for the local stack, so a fresh signup cannot
 * sign in until its email is confirmed, and the admin endpoint that would
 * normally do that is the one refusing these keys. Deliberately no test-only
 * SQL function: adding a "confirm this user" helper to the real schema to make a
 * test pass would put a privilege escalation in production to serve a script.
 */
execFileSync(
  "psql",
  [
    process.env.DB_URL ?? "",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `update auth.users set email_confirmed_at = now() where id = '${userId}'`,
  ],
  { stdio: "pipe" },
);

async function setDeleted(deleted: boolean): Promise<void> {
  const { error } = await admin
    .from("profiles")
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq("id", userId);
  if (error) throw new Error(`set deleted_at: ${error.message}`);
}

/**
 * A real session as cookies. The library writes them, so the encoding is never
 * hardcoded here and a change to it cannot make this test quietly wrong.
 */
async function sessionCookies(): Promise<Map<string, string>> {
  const jar = new Map<string, string>();
  const client = createServerClient(URL_BASE, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign in: ${error.message}`);
  return jar;
}

function toHeader(jar: Map<string, string>): string {
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

/** Runs the real middleware and folds any cookies it set back into the jar. */
async function visit(path: string, jar: Map<string, string>) {
  const request = new NextRequest(`http://localhost:3000${path}`, {
    headers: { cookie: toHeader(jar) },
  });
  const response = await updateSession(request);
  for (const cookie of response.cookies.getAll()) {
    if (cookie.value === "") jar.delete(cookie.name);
    else jar.set(cookie.name, cookie.value);
  }
  return { status: response.status, location: response.headers.get("location") };
}

// A: a live account passes, and pays exactly one round trip.
const jar = await sessionCookies();
rpcCalls = 0;
const first = await visit("/dashboard", jar);
check("live account reaches /dashboard", first.status === 200 && first.location === null);
check("cold request costs one round trip", rpcCalls === 1, `rpcs=${rpcCalls}`);
check("a live mark is issued", jar.has("bs-account-live"));

// B: the marked window costs nothing.
rpcCalls = 0;
for (const path of ["/dashboard", "/editor/abc", "/dashboard/schedule"]) await visit(path, jar);
check("three marked navigations cost zero round trips", rpcCalls === 0, `rpcs=${rpcCalls}`);

// C: the honest cost of the cache is a window where a live mark still works.
await setDeleted(true);
const stillMarked = await visit("/dashboard", jar);
check(
  "an unexpired mark outlives the deletion (the 5 minute window)",
  stillMarked.status === 200,
  `status=${stillMarked.status}`,
);

// D: without the mark, the session is thrown out.
const unmarked = new Map(jar);
unmarked.delete("bs-account-live");
const blocked = await visit("/dashboard", unmarked);
check(
  "deleted session is redirected off /dashboard",
  blocked.location?.endsWith(ACCOUNT_DELETED_PATH) === true,
  `location=${blocked.location}`,
);
check("the session cookie is cleared", ![...unmarked.keys()].some((n) => n.includes("auth-token")));

// E: the mark cannot be forged, extended, or moved to another account.
for (const [name, forged] of [
  ["a pushed-out expiry", `${Date.now() + 60 * 60_000}.${"a".repeat(64)}`],
  ["a bad signature", `${Date.now() + 60_000}.${"b".repeat(64)}`],
  ["a malformed value", "notanumber.zzz"],
] as const) {
  const tampered = await sessionCookies();
  tampered.set("bs-account-live", forged);
  const outcome = await visit("/dashboard", tampered);
  check(`rejects ${name}`, outcome.location?.endsWith(ACCOUNT_DELETED_PATH) === true);
}

// F: the auth screens are not a way back in.
const onLogin = await sessionCookies();
const login = await visit("/login", onLogin);
check(
  "a deleted session on /login is not bounced to /dashboard",
  login.location?.endsWith(ACCOUNT_DELETED_PATH) === true,
  `location=${login.location}`,
);

// G: sign-in names the deletion instead of blaming the password.
const { ACCOUNT_DELETED_MESSAGE } = await import("../src/lib/account/types");
const signIn = await createClient(URL_BASE, ANON, {
  auth: { persistSession: false },
}).auth.signInWithPassword({ email, password });
check("credentials are still valid, so the message is about deletion", signIn.error === null);
check("a deletion message exists and is specific", /deleted/i.test(ACCOUNT_DELETED_MESSAGE));

// H: PostgREST itself refuses the deleted account, with a valid token.
const asUser = createClient(URL_BASE, ANON, {
  auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${signIn.data.session?.access_token ?? ""}` } },
});
const ownProjects = await asUser.from("projects").select("id");
check("PostgREST returns no rows for a deleted account", (ownProjects.data ?? []).length === 0);
const ownOrgs = await asUser.from("organizations").select("id");
check("PostgREST returns no organizations either", (ownOrgs.data ?? []).length === 0);

// I: anonymous and live routing are unchanged.
rpcCalls = 0;
const anon = await visit("/dashboard", new Map());
check(
  "anonymous /dashboard still goes to /login",
  anon.location?.includes("/login?redirect=%2Fdashboard") === true,
  `location=${anon.location}`,
);
check("anonymous requests make no deletion probe", rpcCalls === 0, `rpcs=${rpcCalls}`);

await setDeleted(false);
const live = await visit("/login", await sessionCookies());
check("a live session on /login is still sent to /dashboard", live.location?.endsWith("/dashboard") === true);

await admin.auth.admin.deleteUser(userId);

console.log(results.join("\n"));
console.log(failures === 0 ? `\nAll ${results.length} checks passed.` : `\n${failures} FAILED.`);
process.exit(failures === 0 ? 0 : 1);
