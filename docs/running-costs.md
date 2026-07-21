# Beyond Social: services and running costs

Prepared 21 July 2026. Every figure below was checked against the vendor's
current public pricing on that date. Prices change; re-check before committing
budget. Figures are USD and exclude tax.

Costs are split into three columns:

- **Build**: what you need while the product is being built and tested.
- **Launch**: a small paying user base, roughly 100 active users.
- **Scale**: roughly 1,000 active users.

Usage-based lines are estimates and are marked as such. Fixed subscription
lines are exact.

---

## 1. Domain and identity

| Item               | Why it is needed                                                     | Plan                    | Build   | Launch  | Scale   |
| ------------------ | -------------------------------------------------------------------- | ----------------------- | ------- | ------- | ------- |
| Domain name (.com) | Public address, email sender identity, Apple Pay domain verification | Registrar of choice     | ~$12/yr | ~$12/yr | ~$12/yr |
| TLS certificate    | HTTPS                                                                | Included free by Vercel | $0      | $0      | $0      |

Note: Apple Pay through Stripe requires domain verification but carries no
separate Apple fee. An Apple Developer account is not required.

---

## 2. Hosting and infrastructure

| Item        | Why it is needed                                                                   | Plan                                      | Build       | Launch               | Scale                               |
| ----------- | ---------------------------------------------------------------------------------- | ----------------------------------------- | ----------- | -------------------- | ----------------------------------- |
| Vercel      | Hosts the Next.js web app                                                          | Hobby, then Pro                           | $0          | $20/mo per developer | $20/mo per developer, plus overages |
| Worker host | The BullMQ worker is a long-running process and cannot run on serverless functions | Railway Hobby or Render Starter           | $0 to $5/mo | ~$5 to $7/mo         | ~$25/mo                             |
| Redis       | BullMQ job queue backing store                                                     | Upstash free, then pay as you go or fixed | $0          | ~$0 to $10/mo        | ~$20/mo fixed (1 GB)                |

Vercel Pro includes 1 TB bandwidth, 10 million edge requests and a $20 flexible
spend credit. Viewer seats are free, so only active developers are billed.
Upstash pay as you go is $0.20 per 100,000 commands plus $0.25 per GB-month
above the first free GB, with no bandwidth charge; fixed plans start at $10/mo
for 250 MB and $20/mo for 1 GB.

---

## 3. Database, auth and storage

| Item     | Why it is needed                                                 | Plan           | Build | Launch | Scale             |
| -------- | ---------------------------------------------------------------- | -------------- | ----- | ------ | ----------------- |
| Supabase | Postgres, authentication, and object storage for generated video | Free, then Pro | $0    | $25/mo | $25/mo plus usage |

Supabase Pro is $25/mo and includes a $10 monthly compute credit. Be aware that
compute, egress and per-project charges are billed on top, and that video
storage and delivery is the single most likely line to exceed its base price.
Model egress specifically before launch.

---

## 4. AI services

This is the largest and least predictable category. It is also the one that
scales directly with usage rather than with user count.

| Item                 | Why it is needed                                          | Pricing basis                                                                                                                                      | Notes                                                                                                                              |
| -------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Higgsfield (WAN 2.6) | Generates the video from the user's photos                | Subscription with credits: Starter $15/mo (200 credits), Plus $39/mo (1,000 credits), Ultra $99/mo (3,000 credits), billed annually                | Credit cost per generation varies by model. This is a consumer subscription, not a per-seat API contract. See the risk note below. |
| Claude (Anthropic)   | Writes the script and drives the conversational interface | Per million tokens. Opus 4.8: $5 in, $25 out. Sonnet 5: $3 in, $15 out (introductory $2 in, $10 out through 31 Aug 2026). Haiku 4.5: $1 in, $5 out | Script generation is a short-output task. Sonnet or Haiku are the cost-appropriate tiers here; reserve Opus for harder reasoning.  |
| Firecrawl            | Refreshes the trend feed on a schedule                    | Free 1,000 credits/mo, Hobby ~$16/mo (3,000 credits), Standard ~$83/mo (100,000 credits)                                                           | Credits do not roll over. Trend refresh is a scheduled job, so usage is predictable and easy to cap.                               |

**Estimated AI cost per finished video**

A single video costs roughly: one script generation (a few thousand tokens, so
fractions of a cent on Sonnet or Haiku) plus one video generation (the dominant
cost, set by Higgsfield credits). In practice the script is a rounding error and
the video generation is effectively your entire per-unit cost. Your gross margin
is therefore decided almost entirely by the Higgsfield credit price per
generation and by how many credits a WAN 2.6 render consumes.

**Risk to resolve before launch:** Higgsfield's published pricing is a
consumer subscription tied to an account, not a metered commercial API with
per-generation billing and resale rights. Reselling generations to your own
paying users under a consumer plan may not be permitted, and the credit pools
will not scale to 1,000 users. Contact Higgsfield for commercial or API terms
and get a per-generation price in writing. Do not build a subscription pricing
model on top of an unconfirmed unit cost.

---

## 5. Publishing

| Item        | Why it is needed                                                                                                                 | Plan                                                                                                 | Build | Launch | Scale                           |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----- | ------ | ------------------------------- |
| Upload-post | One API to publish and schedule to TikTok, Instagram, Facebook and YouTube Shorts, and to hold the OAuth and platform compliance | Free tier 10 uploads/mo, paid from $16/mo billed annually with unlimited uploads and full API access | $0    | $16/mo | $16/mo, confirm fair-use limits |

Confirm with Upload-post whether "unlimited" holds when publishing on behalf of
many end users rather than a single account, and whether per-customer social
account connections are supported on that plan.

---

## 6. Payments

| Item   | Why it is needed                   | Pricing basis                                                                                                                                                  |
| ------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stripe | Subscriptions, checkout, Apple Pay | 2.9% + $0.30 per successful US card charge. International cards add 1.5%, currency conversion adds 1%, disputes $15 each. No monthly fee on the standard plan. |

At a $29/mo subscription price, Stripe takes roughly $1.14 per charge, or about
3.9% of revenue. Stripe Billing, if used for subscription management, is charged
on top of the base transaction fee.

---

## 7. Supporting services

These are not in the architecture document but are needed in practice.

| Item                | Why it is needed                                                                                                     | Typical cost                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Transactional email | Password resets, OTP verification, publish notifications. The auth flow already exists and will not work without it. | Free tier is usually sufficient at launch, roughly $20/mo beyond that |
| Error monitoring    | A background worker that fails silently will lose paid user videos                                                   | Free tier at launch, roughly $26/mo beyond that                       |
| Analytics           | Understanding activation and churn                                                                                   | $0 to $20/mo                                                          |

---

## 8. Totals

Fixed monthly cost, excluding all usage-based AI generation and excluding
Stripe's percentage:

|                            | Build        | Launch (~100 users) | Scale (~1,000 users) |
| -------------------------- | ------------ | ------------------- | -------------------- |
| Hosting and infrastructure | $0 to $5     | ~$32                | ~$65                 |
| Database and storage       | $0           | $25                 | $25 plus usage       |
| Publishing                 | $0           | $16                 | $16                  |
| Trends (Firecrawl)         | $0           | ~$16                | ~$83                 |
| Supporting services        | $0           | $0                  | ~$46                 |
| **Fixed subtotal**         | **$0 to $5** | **~$89/mo**         | **~$235/mo**         |

On top of the subtotal:

- **Video generation**: unknown until Higgsfield commercial terms are agreed.
  This will be the largest line at scale by a wide margin.
- **Script generation**: small. At a few thousand tokens per script on Sonnet or
  Haiku, this stays in the low tens of dollars per month even at 1,000 users.
- **Stripe**: about 3.9% of revenue at a $29 price point.
- **Vercel and Supabase overages**: driven by video egress. Model this.

---

## 9. What to settle next

1. **Get a per-generation price from Higgsfield in writing**, with commercial
   resale terms. Nothing else in the model can be finalised until this is known,
   because it sets both unit cost and the minimum viable subscription price.
2. **Confirm Upload-post's multi-tenant terms**, specifically publishing on
   behalf of many end users.
3. **Model video storage and egress on Supabase.** Short-form video is small per
   file but delivery adds up, and it is billed separately from the $25 base.
4. **Decide the Claude tier per task.** Script generation does not need the most
   expensive model; the conversational refinement loop may.
5. **Set a credit quota per plan** that is grounded in the real per-generation
   cost, not a guess.

---

## Sources

Supabase, Vercel, Upstash, Firecrawl, Higgsfield, Upload-post and Stripe public
pricing pages and pricing summaries, all retrieved 21 July 2026. Claude model
pricing from Anthropic's platform documentation, retrieved 21 July 2026.
