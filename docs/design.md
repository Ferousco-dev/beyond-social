# Creator AI capability rollout

## Decision

Creator accounts will be able to run every active, documented Kie video and
avatar model. The composer will offer an explicit **Auto**, **Recommended**,
and **Advanced** model choice. Auto remains the default and uses structural
attachment signals. A manual choice is never trusted by the client: the server
must validate model family, plan, active state, balance, and the complete input
contract before it reserves credits.

The existing 500-credit tester balance remains a hard limit. No paid provider
requests are part of verification.

HeyGen twin renders and voice cloning will remain disabled until their credit
cost is stored in the managed Supabase secrets. The existing pricing document
supports **10 credits per standard, 30-second twin render**. There is no
documented internal conversion for one-time voice-clone cost, so its value must
be explicitly chosen from HeyGen's current API rate before setting
`VOICE_CLONE_CREDIT_COST`; it must not be guessed or coupled to twin-video
pricing.

## Current mismatches

1. `chooseModel` only queries `family = video`, so Auto can never select an
   avatar model. This does not break the dedicated photo-plus-voice path in
   `conversation-thread.tsx`, but it makes model selection logic misleading
   and prevents a shared picker from describing avatar capability correctly.
2. `preferredModel` bypasses `selectModel` entirely. A stored model preference
   can therefore be incompatible with the current attachments. Manual choice
   needs the same treatment unless input compatibility is enforced separately.
3. The composer has one footage control and photo references, but no selected
   model, no input-requirement guidance, and no way to distinguish an editing
   source clip from a reference-video input.
4. The server already has exact Kie builders and rejects invalid requests before
   charging. The browser, however, only discovers those requirements after a
   failed submit.
5. Active advanced models remain Studio-gated in `model_catalog`; the plan gate
   is the database authority, not the UI.

## Availability and input contract

The migration must move only the listed, documented models from `studio` to
`creator`. It must not activate inactive rows as a side effect.

| Model | Creator | Required inputs | Composer guidance |
| --- | --- | --- | --- |
| Kling 3.0 Video | yes | prompt; optional still references | Recommended text/image generation |
| Kling Motion Control | yes | one driving video and one subject photo | “Driving video” plus “Character photo” |
| Wan Video Edit | yes | one source video; optional reference photo | “Source video” and edit instruction |
| Wan Video to Video | yes | one source video | “Source video” and restyle instruction |
| Wan Reference to Video | yes | one or more photos and/or one reference video | “Reference images” plus optional “Reference video” |
| Gemini Omni | yes | prompt; optional image/video refs | Advanced multimodal generation |
| InfiniteTalk / Kling Avatar / Kling Avatar Pro / OmniHuman | yes when active | person photo and either audio clip or cloned voice | Dedicated talking-avatar flow |
| Volcengine Dub | no | source video and audio clip | Keep inactive until a separate dub flow exists |

`wan/2-7-r2v` accepts at least one reference item at the provider boundary, but
the requested product experience is one driving/reference video plus image
references. The picker should therefore recommend both and label either
missing piece before submit, while still allowing documented photo-only R2V
runs if that remains an intentional capability.

## File-level implementation plan

### 1. Catalogue and entitlements

- Add a new migration after `0116_managed_secrets_register_and_backfill.sql`.
  Update `model_catalog.min_plan` to `creator` for active advanced video and
  avatar rows listed above. Use an explicit `id IN (...)` predicate and retain
  `is_active`; do not alter plan rows or account records.
- Do not change `0037` or older migrations. New environments replay the new
  migration after them, and existing environments receive the same correction.
- Keep Volcengine inactive and Studio-only until a provider-contract-tested
  dubbing route is designed.

### 2. A single, typed model-input contract

- Add `apps/web/src/lib/generation/model-inputs.ts` as the web-side mirror of
  `supabase/functions/_shared/kie-models.ts` and
  `supabase/functions/_shared/video-capabilities.ts`.
- Export a discriminated model requirement map: model family, required and
  optional `photo`, `audio`, and `video` inputs, maximum counts, supported
  duration, and whether the model is eligible for the dedicated avatar path.
- Keep provider payload names out of the browser map. The edge builders remain
  authoritative for provider field names and final validation.
- Add pure tests for this map and for `selectModel` for Creator access,
  motion-control, edit, restyle, R2V, and incompatible manual choices.

### 3. Explicit model choice in the composer

- Add a client `ModelPicker` component under
  `apps/web/src/features/dashboard/components/` and a small server query that
  returns active models permitted by the signed-in user's plan. It has three
  modes:
  - **Auto**: no `modelId` is sent. Existing structural routing chooses a safe
    model.
  - **Recommended**: a short filtered list based on current attachments and
    request type.
  - **Advanced**: all plan-eligible active models with capability, input
    requirements, and catalog credit cost.
- Extend `PromptComposer` props and `ConversationThread` state to carry a
  nullable selected model ID. Reset it only when the user explicitly returns
  to Auto; do not silently change a manual selection after uploads.
- Add input-specific status below the picker. Disable send only when a selected
  model lacks a required input; show how to add the missing input. Never infer
  a different model on a manual selection.
- Extend `sendSchema` and the held-turn schema with `selectedModelId` as an
  optional bounded string. Persist it through confirmation/retry so a refresh
  cannot change the model after a user approved its price.

### 4. Server authority and routing

- Refactor `chooseModel`/`selectModel` to accept an optional requested model
  separately from Auto selection. A requested model must be fetched from the
  catalogue and be checked for active status, plan eligibility, and input
  compatibility. It must not be treated as a preference.
- Keep the dedicated `runAvatar` branch in
  `apps/web/src/features/dashboard/components/conversation-thread.tsx`. When
  the selected model is an avatar model, forward it to
  `startAvatarGeneration`; reject a video-family model on this route.
- In the normal video route, forward `selectedModelId` to `generate-video`.
  Keep `planRun` as the final family/active-state check and add the plan check
  there or immediately before it using the authenticated caller. This protects
  direct function requests, which bypass the Next.js gate.
- Replace the current preference shortcut with a validated requested-model
  resolution. Existing saved preferences should be treated as an Auto default
  only when compatible; otherwise explain that the selected inputs require a
  different model rather than dropping inputs.
- Extend `supabase/functions/generate-video/plan.ts` to validate the caller's
  plan, not merely the selected row's active state. Its query should select
  `min_plan`, and the authenticated profile plan should be ranked with the
  same database authority as `can_run_model`.
- Keep `buildMarketInput` before the generation row and credit reservation.
  Add no generic payload fallback.

### 5. Reference video plus image UX

- Rename the existing generic footage affordance contextually in the picker:
  source video for edit/restyle, driving video for motion control, reference
  video for R2V. It still uploads one object into `video-uploads`.
- Continue using the existing multi-photo upload path (maximum four) and
  existing footage upload path (maximum one). The R2V builder already receives
  both via `imagePaths` and `videoPaths` and turns them into separate provider
  fields.
- Update `turn-attachments.ts` only if footage must become visible in message
  history. Today it is deliberately excluded; retain that privacy behaviour
  unless product design explicitly requires replayable footage history.

### 6. HeyGen price gates and UI

- Set `HEYGEN_CREDIT_COST=10` only through the managed-secret mechanism. Do
  not put real values in `.env.example`, source, migrations, or client code.
- Add a server-side readiness query/action that calls the existing edge
  function `probe` endpoints and returns only `{ ready, reason, cost }` to the
  UI. Reuse it in the avatar and voice-cloning surfaces so unavailable means
  “provider setup in progress” rather than a generic error.
- Before enabling `VOICE_CLONE_CREDIT_COST`, record the provider rate source,
  output assumption, credit conversion, and effective cost in
  `docs/pricing-model.md`. Then set it by managed secret and verify the probe.
- Do not use `model_catalog` for either HeyGen operation until their variable
  duration/pricing model is represented accurately. The current direct,
  atomic `reserveCreditsAt` flow is appropriate.

## Verification

1. Unit-test the model input map, Auto selection, manual selection, and input
   rejection paths without provider calls.
2. Run web typecheck and lint, then Deno checks/tests for every changed edge
   function and Kie builder.
3. Apply migrations to a non-production Supabase environment. Assert Creator
   can run every intended active model and cannot run inactive Volcengine.
4. Exercise each input combination through the UI up to edge-function request
   construction with a stubbed provider or probe route: text; image; source
   video; driving video plus photo; reference video plus images; photo plus
   raw voice; photo plus cloned voice.
5. Confirm a direct request with a Studio-only or inactive model is rejected
   before reservation. Confirm an insufficient balance is rejected before
   provider dispatch.
6. Do not make paid Kie or HeyGen generation calls without explicit renewed
   authorization and available credits.

## Risks and rollback

- **Cost exposure:** unlocking expensive models for all Creator testers can
  consume the 500-credit balance quickly. Credit checks, confirmation for a
  more expensive Auto selection, and explicit prices in the picker mitigate
  this. Roll back by a follow-up migration restoring only the affected
  `min_plan` values to `studio`; do not delete ledger history.
- **Provider input drift:** Kie may accept unknown fields silently. Keep the
  existing model-specific builders and tests, and block untested models instead
  of providing a generic request shape.
- **Direct API bypass:** a browser-only picker is not access control. Plan and
  input requirements must be enforced in edge functions before credit
  reservation.
- **Sensitive media:** video and voice uploads remain in private Supabase
  buckets and are handed to providers with short-lived references. Do not make
  them public to simplify previews or tests.
- **HeyGen price error:** a bad configured secret affects real spend. The
  probe confirms readiness but not economics; keep the price source documented
  and unset the secret to immediately return the endpoint to its safe
  `unpriced` state.
