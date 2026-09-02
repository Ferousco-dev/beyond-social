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

## Blocked on a decision only the owner can make

- **`HEYGEN_CREDIT_COST` is unset**, so twin generation refuses with `unpriced`.
  This is deliberate, and the refusal is correct: HeyGen bills a subscription
  plus a per-minute rate, which does not divide into an integer credit ledger.
  Nothing should invent a number here.
- **`HEYGEN_API_KEY` is unset.** Without it every HeyGen path returns
  `provider_unconfigured` (503), including training, which already works.

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
