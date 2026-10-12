# Credit system and admin control: design for approval (M4)

Goal: an admin signs in, pastes provider keys, sets prices if they want to, and the
product works. Nothing here is built yet.

## 1. Plug-in keys (admin-managed provider credentials)

Today four provider keys are required in the server's environment, and the server
refuses to start without them. Instead:

- A `provider_credentials` table holds one row per provider (apify, kie, heygen,
  gemini, later anthropic and stripe): the key sealed with AES-256-GCM, the last 4
  characters, a status (`valid`, `invalid`, `unchecked`), who changed it and when.
- The only secrets left in the environment are the database URL, the Supabase keys
  and one `APP_ENCRYPTION_KEY` (32 random bytes) that seals the rest. Keys are
  never returned by the API after saving; the admin sees `...a1b2`.
- Saving a key first runs a read-only probe against the provider (Apify
  `users/me`, KIE credit balance, HeyGen `users/me`, a tiny Gemini call). A key
  that fails is rejected with the provider's reason, so a typo never goes live.
- The provider clients read their key through a cached lookup (60 s, cleared on
  save), so a new key works at once with no redeploy. If the table is empty the
  environment variable is used, so the current setup keeps working.
- The server starts with no provider keys. A feature whose key is missing reports
  "not configured" to the admin (an alert, see below) and "temporarily unavailable"
  to the user.
- Every change is written to an `admin_audit_log` (who, what, when, never the key).
- A balance monitor checks KIE credits and the HeyGen wallet every 15 minutes (both
  have read-only endpoints; Apify has usage) and raises an admin alert before a
  provider runs dry, not after a user hits it.

## 2. Credits

Unit: one credit is a fixed retail value. Proposed **$0.05 per credit at the base
price**, with price cuts for bigger packs.

Prices are stored per action, not hard-coded:

`action_prices(action, provider, unit, cost_usd_estimate, margin, credits, enabled, updated_by)`

`credits = ceil(cost_usd_estimate x (1 + margin) / 0.05)`. The admin can change the
estimate, the margin, or override `credits` directly; the table is the single place
prices live. Proposed defaults, from the M3 research at a 150% margin (2.5x):

| Action | Our cost | Credits |
|---|---|---|
| Discovery search (20 results) | ~$0.10 | 5 |
| Video transform (Wan 2.6) 5 s, 720p | ~$0.35 | 18 |
| Video transform 10 s, 720p | ~$0.70 | 35 |
| Video transform 5 s, 1080p | ~$0.53 | 27 |
| Avatar video (HeyGen), per second | ~$0.05-0.10 (to confirm) | 3 to 5 per second, settled on the real length |
| Avatar training (digital twin) | not published (to confirm) | placeholder 200 |
| Workflow planning (Gemini) | ~$0.006 | included, capped at 20 plans/day |

Avatar videos are reserved up front from the script length (about 15 characters per
second of speech) and settled to the real duration, with the difference refunded.

Starter packs (provisional, billing is M9): $10 for 200 credits, $25 for 550
(10% extra), $75 for 1,800 (20% extra). A free grant of 25 credits at sign-up
covers one transform or a few searches.

## 3. How a charge works

An append-only `credit_ledger` plus a `credit_balances` row per user, updated in the
same transaction under a row lock so two requests cannot overspend.

1. **Reserve** when a job is accepted (before any provider is called). Not enough
   credit means a clear 402 and no job.
2. **Settle** when the provider confirms success: keep the charge, or adjust it to
   the real cost for per-second actions.
3. **Refund** when the job fails or is cancelled.

Each step carries a unique `(kind, job id)`, so a retried request or a repeated
callback can never charge or refund twice. The hook lives in `jobs.Service` where a
job reaches a final state, so no processor can forget it. Workflows reserve the
estimated total when the user approves the plan.

Ledger entry kinds: `grant`, `purchase`, `reserve`, `settle`, `refund`, `adjust`
(admin), `expire`. Every row records who or what caused it. Admin adjustments need a
reason and are audited.

## 4. What the admin can do

- Connect, replace, test and disconnect provider keys; see provider balances and alerts.
- Edit prices, margins and the free grant; turn an action off.
- Search users; see balance and history; grant or take back credits with a reason.
- See usage and margin: credits charged against the estimated provider cost per
  action and per day, so a wrong price shows up as a number.
- Set per-user and global daily spend caps as a brake against runaway cost.

All of it is admin-only Go endpoints (404 for everyone else), with the web admin
screens built on them in M11.

## 5. Failure behaviour (done in M1)

A provider failure shows the user "Something went wrong... contact support or try
again later", refunds the reserved credits, and alerts the admin when the cause is
credit or key. Credits are never taken for a failed job.

## 6. Build order (M5)

1. Credentials table, encryption, probes, resolver; clients read keys through it.
2. Ledger, balances, reserve/settle/refund and the jobs hook, with tests for
   concurrency, idempotency and refunds.
3. Action price table, seeded with the defaults above.
4. Admin endpoints and the balance monitor.
5. Grants at sign-up.

## Decisions I need

1. Retail value per credit ($0.05 proposed) and the 150% margin.
2. Free grant size (25 proposed). Email confirmation is off, so a free grant can be
   farmed with throwaway addresses; turn confirmation on, or keep the grant small.
3. Packs only, subscriptions only, or both (affects M9).
4. Do credits expire?
5. HeyGen digital twin and avatar-video real costs, from your HeyGen dashboard.
6. Billing currency and country.
