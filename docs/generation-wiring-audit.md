# What is actually wired, and what blocks the rest

Audited 2 September 2026 by reading the dispatch path end to end. Every claim
below cites the file it came from. Where an earlier summary was wrong, the
correction is stated rather than quietly fixed.

## The one blocker that matters most

`apps/web/src/lib/chat/turn.ts` selects a model, and then does not use it:

```
const chosenModel = preference ?? (choice && !choice.worthConfirming ? choice.modelId : null);
```

`worthConfirming` is true whenever the chosen model costs more than the plan's
everyday generator (`lib/generation/select-model.ts`). When it is true the turn
logs a line and silently falls back to the workhorse.

The comment above it says so plainly: the interface that asks about the extra
cost "is the next piece of work".

The consequence is bigger than it looks. **Every premium model in the catalogue
is unreachable**, not because it is inactive or unsupported, but because nothing
can ever confirm the price. Motion control is active (migration 0062), has a
correct input builder, and passes model selection, and it has still never run
for anybody.

So three rows that read "partially wired" are one missing dialog.

## Corrections to the earlier summary

- **Motion control is not blocked at the dispatcher.** The `UNSUPPORTED` record
  in `supabase/functions/_shared/kie-models.ts` is now empty `{}`. Its docstring
  still describes motion control as the live exclusion, which is stale. The real
  block is the confirmation gate above.
- **The cost-confirmation flow is not partially present.** `worthConfirming` and
  `attachmentIgnored` are computed and read, but only to write a log line and a
  notice. There is no UI, and no persisted "waiting on an answer" state.

## Blocked on code (in progress)

| Gap                                                              | Where                              |
| ---------------------------------------------------------------- | ---------------------------------- |
| No cost-confirmation UI, so premium models never run             | `lib/chat/turn.ts`, chat UI        |
| Voice attached with no photo is dropped with no notice           | `lib/generation/select-model.ts`   |
| Twin video has no caller anywhere in `apps/web`                  | `functions/generate-heygen-avatar` |
| Twin video persists nothing, so results cannot reach the Library | same                               |
| Twin video charges nothing; the reservation is a stated TODO     | same                               |
| No poller for twin VIDEO (only for twin TRAINING)                | `functions/poll-heygen-training`   |

### One live bug, not just a gap

`functions/generate-heygen-avatar/index.ts` reads the caller's twin with
`.eq("user_id", user.id).maybeSingle()`. Migration `0096_avatar_library` removed
the one-avatar-per-user constraint and added `is_default`. Any user with two
avatars now makes that call error. It must select the default.

## Voice-only is not a wiring job, and has a better answer

The earlier summary said audio "is stored/attached but is not supplied to the
normal video model", implying it only needs connecting. It does not.

Every avatar model this app can run requires **both** a photo and audio.
`functions/generate-avatar/index.ts:78` refuses outright without both, and the
three models it accepts (`infinitalk/from-audio`, `kling/ai-avatar-standard`,
`kling/ai-avatar-pro`) are all image plus audio. No video model in
`kie-models.ts` takes an audio field at all.

So "prompt + voice, no photo" cannot be served by connecting an existing wire.
It would need either a provider capability nobody has, or generating the video
and muxing the audio afterwards, which is a job for `services/render`, which is
not deployed.

There is a better answer that works today. A person who attaches a voice clip
and no photo usually **has a saved photo already**: `lib/assets/brand.ts:93`
returns their saved avatar. Falling back to it turns an impossible request into
a correct avatar render, using only what is already wired.

That leaves one genuinely empty case, a voice with no photo saved and none
attached, which should say so and offer to save one rather than silently
generating a video the voice is absent from.

## Blocked on a decision only the owner can make

- **`HEYGEN_CREDIT_COST` is unset**, so twin generation refuses with `unpriced`.
  This is deliberate, and the refusal is correct: HeyGen bills a subscription
  plus a per-minute rate, which does not divide into an integer credit ledger.
  Nothing should invent a number here.
- **`HEYGEN_API_KEY` is unset.** Without it every HeyGen path returns
  `provider_unconfigured` (503), including training, which already works.

## Research: what HeyGen actually costs, and one thing to check before paying

Researched 2 September 2026 against HeyGen's own pages.

**Rates, from HeyGen's help centre**, which states them in dollars rather than
its own credits:

| Output                         | Rate          |
| ------------------------------ | ------------- |
| Standard avatar, 720p or 1080p | $1 per minute |
| Avatar IV, 1080p               | $4 per minute |
| Video translation              | $2 per minute |
| Video Agent                    | $2 per minute |

The API is pay as you go, with no subscription: "purchase the exact amount of
API credits you like".

### Why this still does not settle `HEYGEN_CREDIT_COST`

A dollar rate only converts into this app's credits once a credit has a dollar
value, and it does not have one yet. Every plan in `lib/billing/plans.ts`
carries `priceUsd: 0`. So the blocker is not the HeyGen rate, which is now
known; it is that **this product's own pricing is undecided**, and the twin
credit cost cannot be derived before it.

### Check this before buying an API key

HeyGen's API pricing page lists **"Digital Twin Creation API"** as
**Enterprise only**, and secondary sources agree that pay-as-you-go accounts
can create Photo Avatars but not Digital Twins, while _existing_ Digital Twins
can be driven by the API on lower tiers.

HeyGen's own help centre contradicts this, saying "any user, including free
users, can unlock powerful avatar and video features by purchasing any amount
of API credits", but it does not mention Digital Twins specifically.

The two sources genuinely conflict and neither is conclusive. This matters
because `functions/train-heygen-avatar` creates a `digital_twin`, which is the
whole recording flow. **Confirm with HeyGen sales that a pay-as-you-go key can
call `POST /v3/avatars` with `type: digital_twin` before paying for one.** If it
cannot, the recording feature needs either an Enterprise contract or a rebuild
onto Photo Avatars.

### A separate inconsistency this turned up

Plan features advertise "15 videos a month", "100 videos a month" and "400
videos a month", but the catalogue prices a generation at 3 to 60 credits, so
100 credits buys roughly sixteen ordinary videos and as few as one or two
premium ones. The marketing copy and the ledger disagree about what a credit is.

## Blocked on one paid provider call

`wan/2-6-video-to-video` (restyle) is inserted `is_active = false` in migration
`0058_premium_video_models.sql`. The builder exists in `kie-models.ts`, and its
own comment is honest about why it is off: the field names are **inferred from
sibling models rather than confirmed against a successful call**, and being
wrong costs thirty credits per attempt and fails at the provider rather than
locally.

One manual verified call against kie settles it, and activating is then a
one-line migration. That call spends real credits, so it is the owner's to
authorise.

Three further catalogue rows are inactive for the stronger reason that they have
**no input builder at all**: `wan/2-7-videoedit`, `wan/2-7-r2v`,
`gemini-omni-video`. `buildMarketInput` refuses any model it has no builder for,
rather than guessing a field name and silently dropping the user's input.

## Blocked on deployment, not code

These are written and unrun. None is a code gap.

- **`services/render`** (has a `fly.toml`) is not deployed, so editor trim,
  reorder and export cannot complete.
- **`apps/worker`** needs `REDIS_URL`; without it the queue disables itself and
  logs a warning (`apps/worker/src/index.ts:44`), so scheduled publishing does
  not run.
- **Supabase**: 95 migrations exist locally. Production was last seen far behind,
  and several edge functions have never been deployed at all. The web app
  auto-deploys on merge, so the UI can ship against a backend that lacks its
  schema.
- **Platform publishing** additionally needs provider credentials, a user
  connection, and app review from TikTok, Meta and Google, which arrive on
  different days.

## Not a gap

`prompt -> video`, `prompt + images -> video`, `prompt + photo + voice ->
talking head`, `shot list -> multi-shot`, `finished video -> extend`, and
`social post -> inspiration brief` all dispatch correctly and were confirmed by
reading their builders and their callers.
