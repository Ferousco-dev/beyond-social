/**
 * End to end checks for the one-time credit-pack grant, against a real local
 * Supabase and the real webhook route handler.
 *
 * Nothing about the grant path is stubbed: a real signed Stripe event is built
 * with `Stripe.webhooks.generateTestHeaderString` (the SDK's own tool for this,
 * no network call involved) and handed to the actual `POST` export of
 * `src/app/api/billing/webhook/route.ts`. It runs `grant_credits` against a
 * real Postgres, so what this proves is the whole path: signature
 * verification, the `mode === "payment"` branch, the pack lookup, and the
 * database-level idempotency on `credit_ledger.external_ref`.
 *
 * Only Stripe itself is out of reach here (no live account this session), so
 * the "delivery" is a locally-signed payload rather than a real Checkout
 * session. That is the one honest substitution; everything downstream of the
 * signature is the production code.
 *
 *   supabase start && tsx --tsconfig scripts/tsconfig.json scripts/credit-pack-webhook-smoke.ts
 */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const status = execFileSync("supabase", ["status", "-o", "env"], {
  cwd: new URL("../../../", import.meta.url).pathname,
  encoding: "utf8",
});
for (const line of status.split("\n")) {
  const match = /^([A-Z0-9_]+)="?([^"]*)"?$/.exec(line.trim());
  const [, key, value] = match ?? [];
  if (key !== undefined) process.env[key] = value ?? "";
}

const URL_BASE = process.env.API_URL ?? "";
const ANON = process.env.PUBLISHABLE_KEY ?? process.env.ANON_KEY ?? "";
const SERVICE = process.env.SECRET_KEY ?? process.env.SERVICE_ROLE_KEY ?? "";

if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(URL_BASE)) {
  throw new Error(`refusing to run against a non-local Supabase: ${URL_BASE || "(unset)"}`);
}

// Every value the route's module-scope `serverEnv`/`env` parsing reads has to
// be set before that module is ever imported, hence the dynamic imports below.
process.env.NEXT_PUBLIC_SUPABASE_URL = URL_BASE;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON;
process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE;
process.env.STRIPE_SECRET_KEY = "sk_test_smoke_only_never_used_for_a_real_call";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_smoke_" + randomUUID().replace(/-/g, "");

const { default: Stripe } = await import("stripe");
const { createClient } = await import("@supabase/supabase-js");
const { POST } = await import("../src/app/api/billing/webhook/route");
const { CREDIT_PACKS } = await import("../src/features/billing/credit-packs");

const results: string[] = [];
let failures = 0;
function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
  if (!passed) failures += 1;
}

const admin = createClient(URL_BASE, SERVICE, { auth: { persistSession: false } });
const anon = createClient(URL_BASE, ANON, { auth: { persistSession: false } });

const email = `credit-pack-smoke-${Date.now()}@example.test`;
const signup = await anon.auth.signUp({ email, password: "Sm0ke-Test-Password!" });
if (signup.error || !signup.data.user) throw new Error(`create user: ${signup.error?.message}`);
const userId = signup.data.user.id;

/** A signed request, exactly as Stripe would deliver it. */
function deliver(eventType: string, object: Record<string, unknown>): Request {
  const payload = JSON.stringify({
    id: `evt_${randomUUID()}`,
    object: "event",
    type: eventType,
    data: { object },
  });
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
  return new Request("http://localhost/api/billing/webhook", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: payload,
  });
}

function checkoutSession(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: `cs_test_${randomUUID()}`,
    object: "checkout.session",
    mode: "payment",
    client_reference_id: userId,
    customer: `cus_test_${randomUUID()}`,
    metadata: {},
    ...overrides,
  };
}

async function grantRows(): Promise<{ delta: number; external_ref: string | null }[]> {
  const { data, error } = await admin
    .from("credit_ledger")
    .select("delta, external_ref")
    .eq("user_id", userId)
    .eq("reason", "purchase:plus");
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function creditsTotal(): Promise<number> {
  const { data, error } = await admin
    .from("profiles")
    .select("credits_total")
    .eq("id", userId)
    .single();
  if (error) throw new Error(error.message);
  return data.credits_total;
}

try {
  const pack = CREDIT_PACKS.find((p) => p.id === "plus")!;
  const baseline = await creditsTotal();
  check("signup grant landed first (baseline is 15)", baseline === 15, `baseline=${baseline}`);

  // A: no signature header at all.
  const bare = new Request("http://localhost/api/billing/webhook", { method: "POST", body: "{}" });
  const bareRes = await POST(bare);
  check("missing signature is rejected", bareRes.status === 400);

  // B: a tampered payload fails verification and grants nothing.
  const tamperedPayload = JSON.stringify({
    id: "evt_tampered",
    type: "checkout.session.completed",
    data: { object: checkoutSession({ metadata: { packId: "plus" } }) },
  });
  const tamperedSig = Stripe.webhooks.generateTestHeaderString({
    payload: tamperedPayload,
    secret: "whsec_wrong_secret",
  });
  const tamperedRes = await POST(
    new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      headers: { "stripe-signature": tamperedSig },
      body: tamperedPayload,
    }),
  );
  check("bad signature is rejected", tamperedRes.status === 400);
  check("bad signature grants nothing", (await grantRows()).length === 0);

  // C: a subscription-mode checkout completing does not touch the pack path.
  const subRes = await POST(
    deliver("checkout.session.completed", checkoutSession({ mode: "subscription", metadata: {} })),
  );
  check("subscription-mode checkout is accepted", subRes.status === 200);
  check("subscription-mode checkout grants no pack credits", (await grantRows()).length === 0);

  // D: unknown pack id is ignored, not guessed at.
  const unknownRes = await POST(
    deliver(
      "checkout.session.completed",
      checkoutSession({ metadata: { packId: "not-a-real-pack" } }),
    ),
  );
  check("unknown pack id is accepted (still 200)", unknownRes.status === 200);
  check("unknown pack id grants nothing", (await grantRows()).length === 0);

  // E: missing client_reference_id is ignored, not attributed to nobody.
  const noUserRes = await POST(
    deliver(
      "checkout.session.completed",
      checkoutSession({ client_reference_id: null, metadata: { packId: "plus" } }),
    ),
  );
  check("missing user id is accepted (still 200)", noUserRes.status === 200);
  check("missing user id grants nothing", (await grantRows()).length === 0);

  // F: the real purchase. One session, one grant, the pack's exact credit count.
  const session = checkoutSession({ metadata: { packId: "plus" } });
  const firstRes = await POST(deliver("checkout.session.completed", session));
  check("purchase checkout is accepted", firstRes.status === 200);
  const afterFirst = await grantRows();
  check("exactly one grant row exists", afterFirst.length === 1, `rows=${afterFirst.length}`);
  check(
    "grant amount matches the pack's credits",
    afterFirst[0]?.delta === pack.credits,
    `delta=${afterFirst[0]?.delta} expected=${pack.credits}`,
  );
  check(
    "external_ref is keyed on the session id",
    afterFirst[0]?.external_ref === `credit_pack_session:${session.id}`,
  );
  const balanceAfterFirst = await creditsTotal();
  check(
    "balance rose by exactly the pack's credits",
    balanceAfterFirst === baseline + pack.credits,
    `balance=${balanceAfterFirst}`,
  );

  // G: Stripe redelivers the same event. The grant must not double.
  const secondRes = await POST(deliver("checkout.session.completed", session));
  check("redelivery is still accepted", secondRes.status === 200);
  const afterSecond = await grantRows();
  check(
    "redelivery adds no second grant row",
    afterSecond.length === 1,
    `rows=${afterSecond.length}`,
  );
  const balanceAfterSecond = await creditsTotal();
  check(
    "redelivery leaves the balance unchanged",
    balanceAfterSecond === balanceAfterFirst,
    `balance=${balanceAfterSecond}`,
  );
} finally {
  await admin.auth.admin.deleteUser(userId).catch(() => {
    // Best-effort: this stack's admin API is flaky about which key it accepts.
    // An orphaned smoke-test user in a local database is not worth failing over.
  });
}

process.stdout.write(
  `${results.join("\n")}\n${
    failures === 0 ? `\nAll ${results.length} checks passed.` : `\n${failures} FAILED.`
  }\n`,
);
process.exit(failures === 0 ? 0 : 1);
