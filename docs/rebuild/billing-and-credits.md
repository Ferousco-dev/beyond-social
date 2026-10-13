# Billing, credit management and what is left

Written 13 Oct 2026. The next milestone is Stripe credit packs and a real pricing
page. This document records how credits work today, the plan for Stripe, and every
open item across the rebuild. It builds on `credit-system-design.md` (the original
design) and `pricing-research.md` (provider costs).

## 1. How credits work today (built and tested)

- One append-only ledger (`credit_ledger`) and one balance row per user
  (`credit_balances`). Every change is a ledger row with a unique idempotency key, and
  the balance can never go negative. Kinds: `grant`, `purchase`, `reserve`, `settle`,
  `refund`, `adjust`, `expire`. The `purchase` kind already exists and is unused.
- Work that costs money follows one pattern: reserve before starting, settle when it
  delivers, refund when it fails. Jobs do this through the job biller; one-off actions
  (search, avatar training, editor assistant, captions, watching a clip) do it through
  the action biller. A sweeper closes any charge left open by a crash.
- Prices live in `action_prices` and the admin edits them at `/dashboard/admin/pricing`.
  Current values (credits):

| Action | Credits |
|---|---|
| Discovery search | 5 |
| Video transform, 5 s / 10 s at 720p | 18 / 35 |
| Video transform, 5 s / 10 s at 1080p | 27 / 53 |
| Generated video (Kling), per second | 4 |
| Avatar video, per second | 4 |
| Avatar training | 200 |
| Editor assistant message | 1 |
| Editor captions (one clip) | 10 |
| Editor, watch a clip | 5 |

- Admin settings (`credit_settings`): free credits for a new account (now 300), a daily
  spending limit per user, and low-balance alert thresholds for KIE, HeyGen and Apify.
- Admin can find a user, read their ledger and adjust their balance (audited).
- Users see their balance in the sidebar and a history page. The balance shows
  "unavailable" rather than 0 when the server cannot be reached.
- Chat messages cost nothing but count toward a daily message limit.

Known gaps in what exists: the prices are estimates from `pricing-research.md` and have
never been checked against a real month of provider bills; there is no way to buy
credits; the Kling and HeyGen live runs that would confirm real cost have not been done.

## 2. Stripe credit packs (built 13 Oct, not yet run against Stripe)

Built: packs and payments tables, admin pack editor, Checkout, signed webhook, refund clawback, pricing page, credits page. Differences from the plan below: the price is sent inline with each Checkout Session, so nothing is created in the Stripe dashboard and no `stripe_price_id` is stored. Still to do: one test-mode purchase with the owner's keys, then the receipts email and Stripe customer portal link.

### Decisions to confirm with the owner first

1. Pack sizes and prices. The original design proposed one credit = $0.05 at base,
   with $10 for 200, $25 for 550 and $75 for 1,800. Treat these as placeholders until
   the real costs in section 1 are confirmed.
2. Whether credits expire. Recommendation: they do not.
3. Currency and tax. Recommendation: USD, with Stripe Tax switched on once the owner
   has registered where needed.
4. Refund policy for purchased credits that were not used.

### Flow

1. A signed-in user chooses a pack on `/dashboard/credits` (or on the public
   `/pricing` page, which sends signed-out visitors to sign up first).
2. A server action asks the Go API to create a Stripe Checkout Session in payment mode
   for that pack. The session carries the user id and pack id as metadata and uses an
   idempotency key, so a double click makes one session. The client is redirected to
   Stripe's hosted page. No card data ever touches our servers.
3. Stripe calls `POST /api/v1/callbacks/stripe`. The handler:
   - verifies the signature on the raw body with the webhook secret, and rejects
     anything older than five minutes;
   - on `checkout.session.completed` (and `async_payment_succeeded` for slow methods)
     with `payment_status = paid`, grants the pack's credits as a `purchase` ledger row
     whose idempotency key is the Stripe session id, so a replayed event adds nothing;
   - on `charge.refunded` or a dispute, removes the unused part of those credits with an
     `adjust` row, never taking the balance below zero, and raises an admin alert.
4. The user lands back on `/dashboard/credits?paid=1`. The page shows the new balance
   once the webhook has been processed and says so plainly while it waits.

### Data

- `credit_packs(id, name, credits, price_cents, currency, enabled,
  sort, updated_by, updated_at)`. Admin edits packs at `/dashboard/admin/packs`.
- `payments(id, user_id, pack_id, stripe_session_id unique, stripe_payment_intent,
  amount_cents, currency, credits, status, created_at)` for receipts and for matching
  refunds to the credits they paid for.
- Vault names to add: `stripe_secret_key`, `stripe_webhook_secret`. The admin pastes
  them in the console like every other key. The key probe calls a read-only Stripe
  endpoint before saving.

### Pages

- `/pricing` already exists as a static page. Replace its content with live packs read
  from the API, the price list for each action in plain words ("a 10 second video costs
  about 40 credits"), and a short explanation that credits do not expire.
- `/dashboard/credits` gains pack cards, a receipts list, and a link to Stripe's
  customer portal for invoices.

### Tests to write with it

Signature verification (valid, wrong secret, old timestamp), replayed events, a paid
event for an unknown user or pack, refund clawback that stops at zero, and the checkout
creation with a fake Stripe client. Run the whole flow once in Stripe test mode with a
test card before any live key is used.

### What the owner must do

Create the Stripe account, create test and live API keys, add the webhook endpoint
`PUBLIC_BASE_URL/api/v1/callbacks/stripe` for the events above, and paste the keys and
the webhook secret in the admin console.

## 3. Credit management improvements

- **Show costs before spending.** Every action that costs credits should say what it
  costs before the user commits. Done for the editor (assistant, captions, new scene).
  Still to do: search, video transforms, avatar videos and training in the chat flow.
- **Low balance.** A banner in the app below a threshold, and an email, with a one
  click link to buy.
- **Real cost tracking.** OpenRouter returns the true dollar cost of each answer. Log
  it per request, compare weekly revenue in credits against provider spend, and show
  the margin on the admin usage page so a wrong price is visible.
- **Price from real cost.** Once there is a month of data, adjust `cost_usd` and margin
  in `action_prices`. Consider pricing assistant messages from the model chosen.
- **Abuse limits.** The daily spending limit exists. Add a per-day cap on free-grant
  signups from one network and a review queue for accounts that spend the free grant
  within minutes.
- **Statements.** Let a user export their ledger as a CSV.

## 4. Everything else that is left

### Needs the owner

- A working Gemini key. Chat, scripts, link analysis, captions, watching a clip and the
  editor assistant have only been tested with stubs.
- An OpenRouter key, to try a non-Gemini model from `/dashboard/admin/models`.
- A real Kling generation (spends real KIE credits, so it needs the owner's go-ahead)
  and a real HeyGen avatar video, to confirm costs and the whole path.
- TikTok, Meta and Google developer apps and their review. Instagram needs a Business
  account linked to a Facebook Page.
- A domain, then `PUBLIC_BASE_URL`, `NEXT_PUBLIC_APP_URL`, Supabase and social
  callbacks (see the domain checklist in the project memory).
- The Render deploy in Frankfurt with `ADMIN_EMAILS` set.

### Editor

- Transitions that blend two clips (a true crossfade). Today an entrance plays over the
  start of one clip. A crossfade needs footage on both sides of a cut.
- Curve speed (ramps), pitch-preserving speed, and speed for pictures.
- A text-to-speech voice (KIE ElevenLabs) and voice-over recording.
- Keyframe easing options and per-keyframe editing of values by number.
- The preview and export were checked in Chrome only. Export needs a browser that can
  encode video (recent Chrome or Edge) and says so otherwise.
- The speed, entrance and keyframe panels have tests for their logic but have not been
  checked by eye in a browser.
- Dragging a real file from the desktop onto the timeline has not been tried.

### Platform

- Old code that still holds provider keys or is unused: `client/src/lib/social`, the old
  connection and publishing helpers that nothing renders, `packages/ai-gateway`,
  `packages/prompt-engine`, `packages/rate-limit`, generated Supabase types, and unused
  dependencies (stripe, openai, anthropic). See `deletion-proposal.md`.
- `docs/ARCHITECTURE.md` and `docs/design.md` still describe the old design.
- No end-to-end browser tests. The client has unit tests for the editor core only.
- The unused editor project list, create and delete endpoints are tested but no screen
  calls them (projects open from a chat). Remove them or keep them for a future screen.
- A final security and quality audit before launch.

## 5. Suggested order

1. Owner supplies the Gemini key; run the live checks in section 4.
2. Stripe: packs table and admin screen, checkout, webhook, pricing page, tests, one
   test-mode purchase.
3. Credit management items in section 3 that protect margin (real cost tracking, costs
   shown before spending).
4. Old code deletion, docs, audit, deploy.

## 6. Billing status (13 Oct 2026, after plans and settings)

Built and tested: credit packs, Pro subscriptions, usage windows, Free limits, the usage
page, settings, limit and upgrade messages with links on chat, Discover and the editor, a
low-credits and near-limit banner, product emails (credits added, Pro started, payment
failed, Pro ended, limit reached) through Resend, an admin Revenue page (members, revenue,
credits spent), the email sender setting, optional Stripe Tax (admin setting
`stripe_tax_enabled`), draft Terms and Privacy pages that describe plans, credits,
payments and refunds, and account deletion that erases what the account made.

Left, all needing the owner:

1. **Stripe test mode run.** Paste the keys, forward events with the Stripe CLI, and make
   one pack purchase (as a Pro test user), one subscription, one refund and one
   cancellation. Nothing has run against the real Stripe. Turn on "email customers for
   successful payments" in Stripe so Stripe sends the card receipts.
2. **Resend.** Create the account, verify a domain, paste the key in Provider keys and set
   the sender address. Until then no emails go out and the app logs that.
3. **Legal review.** The Terms and Privacy text is a draft and says so on the page. Have it
   reviewed, and decide the refund policy (the draft allows a full refund of an unused pack
   within 14 days and none for the used part of a subscription period).
4. **Stripe Tax.** Register where needed, set it up in Stripe, then switch the setting on.
5. **Tune the numbers** (limits, weights, Free multiplier, Pro price) after a month of real
   provider bills, using the Revenue page and each provider's dashboard.

Known limits: the watermark is drawn in the browser and a technical user could remove it
(enforcing it needs server side rendering); a job already started when a cap is reached
still finishes; the Revenue page counts only payments and invoices recorded here.
