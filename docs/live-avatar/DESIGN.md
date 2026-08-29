# Live avatar feature: design

Owner-approved direction, 2026-08-29: build for HeyGen. Confirmed live in the
same conversation that no kie.ai model does this "perfectly" — see
[BACKLOG.md](../loop-engineering/BACKLOG.md)'s owner-directed-priority
section for the research trail (`docs.kie.ai/market/kling/ai-avatar-pro.md`,
`omnihuman-1-5.md`, `volcengine/video-to-video-lip-sync.md`, all checked
directly: every one of them trains from a still photo or re-dubs an existing
clip, none trains from a recorded video). HeyGen's Avatar V is the one
verified provider that builds a photorealistic, speaking digital twin from a
15-second video clip, which is what "record yourself, then generate new
videos of you saying anything" actually needs.

This document is the design gate `docs/loop-engineering/BACKLOG.md` already
committed to: no implementation code for the HeyGen path ships before this is
written down and read. It stays the reference as the feature gets built in
scoped units.

## What already exists, and what is actually new

This is smaller than the original brief made it sound, because most of the
supporting pipeline is already live:

| Piece | Already exists | What HeyGen changes |
| --- | --- | --- |
| Save one face photo | `brand_assets` (kind `avatar`), `avatar-card.tsx` | Superseded for Live users: HeyGen trains from video, not a still |
| Save one voice clip | `voice_profiles`, `enroll-card.tsx`, a read-along phrase (`lib/voice/phrase.ts`) | Superseded: HeyGen's Avatar V trains face *and* voice from the same clip |
| Consent to reuse a likeness | `likeness_consents`, `CONSENT_VERSION`/`CONSENT_STATEMENT` (`features/generation/consent.ts`), checked both client-side and inside the edge function | Needs a second, HeyGen-specific statement (see Consent below); the existing table and gating pattern are reused as-is |
| Generate a video from a saved photo + voice | `generate-avatar` edge function, dispatches to kie.ai's avatar family | Not reused for the Live path: HeyGen is a different API with a different job shape. `generate-avatar` keeps serving the existing photo+clip flow unchanged |
| Actual voice cloning (say new words in the saved voice) | **Does not exist today.** `voice_profiles.provider_voice_id` is a real column but nothing ever sets it — enrollment just stores one fixed clip and today's avatar path replays that exact clip's audio, it does not synthesize new speech | HeyGen's Avatar V does this itself, as part of one video-generation call. This is the actual gap the whole feature exists to close |

So the genuinely new work is: a video-recording flow instead of two separate
uploads, a new consent statement fit for that, a new stored "trained avatar"
record per user (HeyGen's own asset id, not a photo path), and a new
generation dispatch path that calls HeyGen instead of kie.ai. Everything
about *how* consent is gated, stored, and checked before dispatch follows the
pattern `likeness_consents` and `generate-avatar` already established; this
is extension, not invention.

## Data model

New table, `heygen_avatars`, one row per user, same shape and RLS pattern as
`voice_profiles` (delete-by-owner, single row via a unique index on
`user_id`):

```sql
create table public.heygen_avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,

  -- The recording that trained it. Kept for the same reason voice_profiles
  -- keeps its clip: a later dispute about what was actually submitted needs
  -- the source, not just HeyGen's derived asset.
  storage_path text not null,

  -- HeyGen's own identifier for the trained avatar. Null while training is
  -- in progress (Avatar V training is not instant); the row exists before
  -- this is known so the UI has something to poll against.
  provider_avatar_id text,
  training_status text not null default 'pending'
    check (training_status in ('pending', 'ready', 'failed')),

  -- Separate from likeness_consents.statement_version: this is consent to a
  -- specific HeyGen-shaped statement (biometric training, a named third
  -- party, the read-along verification step), not the general "a video will
  -- be made from this" wording used elsewhere in the app.
  consent_version integer not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Not reusing `brand_assets` or `voice_profiles` directly: both are keyed to a
single storage object with a simple consent flag, and this needs a
provider-side async job id and a training-status lifecycle neither table
has. A fourth "kind" bolted onto `brand_assets` would mean every reader of
that table now has to know which kinds have a `provider_avatar_id` and which
don't; a dedicated table keeps that boundary honest, the same reasoning
`voice_profiles` itself already used to justify not folding into
`brand_assets`.

## Consent

Reuses the mechanism, not the wording. `likeness_consents` stays the general
gate for "a video was made from someone's face"; a second statement is
recorded for training a persistent, reusable digital twin specifically,
because that is a materially bigger promise than "generate one video from
this photo." Modeled on HeyGen's own published flow (already researched in
BACKLOG.md): explicit consent before training starts, read aloud on camera
rather than a checkbox, and a plain statement of what gets kept and for how
long.

Draft wording (Siri-setup-style, read on camera, stored as the training
video's own soundtrack — the same "the attestation lives inside the
recording" idea `voice_profiles.phrase` already uses):

> "Hello, I'm [name]. I'm recording this so the app can create new videos of
> me, in my own voice, from anything I type. I understand this video trains
> a reusable digital version of my face and voice, which I can delete at any
> time from my settings."

Retention: same policy as `voice_profiles` today, not a new invention —
kept until the user deletes it, no automatic expiry. `docs/loop-engineering/
BACKLOG.md`'s open "storage lifecycle rules" item is a real, separate gap
(no TTL sweep exists for *any* stored asset in this app yet), but it is a
cross-cutting gap, not one this feature should solve alone or be blocked by:
Live ships with exactly the retention guarantee voice enrollment already
ships with today. `heygen_avatars` gets the same owner-deletable RLS policy
`voice_profiles` has, and deleting the row triggers a HeyGen-side delete
call too (their API supports removing a trained avatar; the app should never
be the only place a "deleted" likeness still exists).

## Recording flow

New entry point (sidebar or new-project menu, per the original brief), one
screen, three short lines to read rather than one — long enough for Avatar V
to have a real sample, short enough to not feel like a chore:

1. The consent statement above, read aloud (this is the training clip's
   audio *and* the consent record at once, same dual-purpose idea as
   `enrollmentPhrase`).
2. A second line, prompted, natural speech for training variety (HeyGen's
   own guidance recommends more than one static sentence for a convincing
   result).
3. A short pause with a neutral expression, camera still rolling — Avatar V
   documentation asks for this for a clean training frame.

Camera + mic via `MediaRecorder`, the same primitive `useVoiceRecorder`
already wraps for audio; this needs a video-capable sibling hook rather than
a new capture mechanism from scratch. Uploads to the existing `uploads`
bucket under the user's own prefix, same as every other asset.

## Generation path

New edge function, `generate-heygen-avatar`, deliberately not a branch
inside `generate-avatar`: the request/response shape, the credit model, and
the provider are all different enough that sharing the function would mean
threading a provider switch through every line of it. Shape, mirroring
`generate-avatar`'s own structure:

1. Authenticate, load the caller's `heygen_avatars` row, refuse if
   `training_status != 'ready'`.
2. Check credits (see Pricing below — this is the one step that cannot ship
   until that is answered).
3. Call HeyGen's video-generation endpoint with the trained avatar id and
   the user's prompt text.
4. Record the job the same way `generate-avatar` does: a `video_generations`
   row, credits reserved before dispatch, never after.
5. Poll or webhook for completion, same `poll-generation`/`kie-callback`
   pattern this app already runs for kie.ai, adapted to HeyGen's own status
   API.

## Pricing — still genuinely open

HeyGen bills nothing like kie.ai's flat per-run `credit_cost`: a subscription
tier plus roughly 20 credits per minute of output, separate from this app's
own credit ledger. `docs/loop-engineering/BACKLOG.md`'s existing rule holds:
nothing here goes active on a guessed rate. This ships the same way the
Wan/Gemini rows in migration `0058` did — the code path built and gated
behind `is_active = false` / an unconfigured-provider no-op, exactly like
this morning's Firebase pattern (ships inert, turns on once real numbers and
credentials exist).

## What is needed to actually turn this on

Two things only the owner can provide, not a process gate:

1. **A HeyGen account and API key.** Signing up for a paid third-party
   service and entering payment details is not something this system can do
   on its own, live owner approval or not — there is no mechanism here to
   create accounts or hold payment credentials. `NEXT_PUBLIC_HEYGEN_*`/
   `HEYGEN_API_KEY` env vars follow the same "ships, no-ops until set"
   pattern as this morning's Firebase keys once they exist.
2. **A real per-minute or per-run price**, read off HeyGen's actual current
   pricing page at the point of integration (the rough numbers in
   BACKLOG.md are from public comparison pages, not a quote) plus a decision
   on how that maps to this app's own credit balance.

Everything else in this document — the schema, the consent flow, the
recording UI, the edge function shape — is buildable now, in scoped units,
without either of those, ending in code that compiles, type-checks, and does
nothing live until they exist.

## Build order

Scoped so each unit is independently shippable and reviewable, following the
same one-PR-per-unit discipline the rest of this project uses:

1. `heygen_avatars` migration + RLS, no application code yet.
2. The HeyGen-specific consent statement + version constant, following
   `features/generation/consent.ts`'s existing pattern.
3. The video-recording hook and the Live entry-point UI, saving to
   `heygen_avatars` with `training_status = 'pending'` and no real HeyGen
   call yet (the upload and consent-capture flow is independently useful
   and testable before any provider integration exists).
4. A thin HeyGen API client (`supabase/functions/_shared/heygen.ts`,
   mirroring `_shared/kie.ts`'s shape) and the training-kickoff call, behind
   an `isHeygenConfigured()` no-op guard until real credentials exist.
5. `generate-heygen-avatar` and the polling/webhook completion path.
6. Pricing wiring, once a real rate exists — the last step, not the first.
