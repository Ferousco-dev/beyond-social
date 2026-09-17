# Software Requirements Specification: AI capability completion

| Field | Value |
| --- | --- |
| Document ID | SRS-beyond-social-v1 |
| Status | Draft for CR-001 |
| Author | Analyst |
| Source | Owner interview and repository analysis, 2026-09-16 |

## 1. Purpose and scope

CR-001 makes the application's existing AI capabilities usable by Creator-plan
testers. It covers plan availability, model selection, attachment requirements,
and HeyGen credit gates. It does not add an AI provider or make paid provider
requests as part of verification.

**Terms.** Auto chooses a compatible model from the catalog. Recommended is a
curated compatible model. Advanced is an explicit compatible catalog model.
Reference-to-video uses one driving video and one or more reference images.

## 2. Constraints and assumptions

- DEC-001 through DEC-006 in `.ilana/ledger.md` apply.
- A credit represents USD 0.05 of provider cost, per the existing plan catalogue.
- Tester balances stay capped by the existing 500-credit allocation. This is a
  balance policy, not an unlimited-generation entitlement.
- All active advanced catalog models must be available to Creator testers. A
  model may remain unavailable only when its provider configuration is missing,
  its configured credit cost is invalid, or its required inputs are absent.
- The existing consent, ownership, server-side validation, and credit-debit
  controls for face and voice media remain mandatory.

## 3. Functional requirements

### REQ-001: Creator advanced-model access

**Priority:** must. **Source:** Owner interview, 2026-09-16.

The system shall make every active advanced video and avatar model eligible for
Creator-plan testers, subject to input compatibility, provider configuration,
consent, and sufficient credits.

Acceptance: Given a Creator tester and an active compatible model, when the
tester opens the picker, then that model is selectable and its credit cost is
shown. Given a missing prerequisite, then the model is unavailable with a
specific reason and no generation is submitted.

Verified by: TC-001, TC-002. Depends on: REQ-002, REQ-005.

### REQ-002: Explicit model picker

**Priority:** must. **Source:** Owner interview, 2026-09-16.

The generation interface shall offer Auto as the default selection and offer
Recommended and Advanced selections for every compatible active model. Each
listed model shall show its name, input requirements, and credit cost before
submission.

Acceptance: Given a valid generation draft, when the user opens the picker,
then Auto, Recommended, and Advanced choices are distinguishable. When a user
selects an eligible model, then that model identifier is submitted unchanged.

Verified by: TC-003, TC-004. Depends on: REQ-005.

### REQ-003: Deterministic Auto routing

**Priority:** must. **Source:** Owner interview, 2026-09-16.

The system shall select a compatible model when Auto is selected. A draft with
an image, voice audio, and prompt shall route to an avatar-family model rather
than a general video-family model. Auto shall refuse, with an actionable input
message, when no active compatible model exists.

Acceptance: Given image, voice, and prompt attachments, when Auto is used,
then the selected request uses the avatar family. Given incompatible inputs,
then no provider request is made.

Verified by: TC-005, TC-006. Depends on: REQ-002, REQ-005.

### REQ-004: Reference-to-video input flow

**Priority:** must. **Source:** Owner interview, 2026-09-16.

The interface shall collect one driving video and one or more reference images
for reference-to-video. It shall identify missing inputs before submission and
send the validated media in the provider-required roles.

Acceptance: Given a user choosing reference-to-video, when one driving video
and at least one image are attached, then submission is enabled. When either
role is absent, then submission is blocked and the missing role is named.

Verified by: TC-007, TC-008. Depends on: REQ-005.

### REQ-005: Capability-specific validation and consent

**Priority:** must. **Source:** Owner interview and security review,
2026-09-16.

The system shall validate model family, plan availability, attachment type and
count, owned media, consent, provider configuration, and credits on the server
before creating a generation. It shall debit credits only after validation and
preserve the existing provider failure/refund behavior.

Acceptance: Given a forged model identifier, foreign media URL, missing consent,
or insufficient credit balance, when the request reaches the server, then it is
rejected without a provider call or net credit debit.

Verified by: TC-009, TC-010. Depends on: DOM-001, DOM-002.

### REQ-006: HeyGen tester pricing gates

**Priority:** must. **Source:** Owner interview, 2026-09-16.

The system shall enable configured credit costs for HeyGen twin-video generation
and voice cloning, expressed as positive integer product credits. The selected
costs shall be documented with the provider-rate source, calculation date, and
the USD 0.05 credit conversion before deployment. A missing or invalid cost
shall remain fail-closed and explain that the feature is temporarily unavailable.

Acceptance: Given a valid configured cost and balance, when a user starts the
feature, then the shown and charged costs agree. Given no valid configured cost,
then no provider call or credit debit occurs.

Verified by: TC-011, TC-012. Depends on: REQ-005.

### REQ-007: Safe non-billable verification

**Priority:** must. **Source:** Owner instruction, 2026-09-16.

The release verification shall exercise local validation, model routing, UI
states, static checks, and provider probe paths only. It shall not submit a paid
Kie.ai or HeyGen generation, training, cloning, or dubbing request without a
new explicit owner instruction.

Acceptance: Verification evidence shows no paid provider request was issued.

Verified by: TC-013.

## 4. Non-functional requirements

### NFR-001: Preflight clarity

Before submission, each selectable model shall expose its cost and required
inputs in the picker. Measurement: component and browser checks for every active
model. Threshold: 100% of selectable models.

Verified by: TC-003.

### NFR-002: Credit safety

Validation failure shall result in zero net credit debit and zero paid provider
request. Measurement: action and Edge Function tests. Threshold: 100% of tested
failure paths.

Verified by: TC-009, TC-010, TC-012.

### NFR-003: Sensitive-media protection

Face and voice inputs shall continue to use authenticated, owned private media
and explicit consent where the existing flow requires it. Measurement: server
authorization and consent tests. Threshold: 100% of tested unauthorized cases
are rejected.

Verified by: TC-010.

## 5. Domain requirements

### DOM-001: Biometric likeness and voice consent

The system shall preserve explicit consent and ownership checks before sending a
person's likeness or voice to an avatar or voice provider. This applies because
the product processes face and voice recordings. The specific privacy regime is
not yet selected; normal SaaS safeguards are the owner-approved baseline.

Verified by: TC-010.

### DOM-002: Provider and financial control

The system shall treat model and HeyGen credit costs as server-enforced billing
controls. Client-provided costs, plan claims, and provider-facing URLs are not
authoritative.

Verified by: TC-009, TC-011, TC-012.

## 6. Provider risks and out of scope

- Kie.ai and HeyGen may reject valid requests, change input constraints, or
  change pricing. Provider errors must be surfaced without optimistic success.
- HeyGen pricing cannot be responsibly fixed without a current official rate;
  implementation must record the rate evidence before setting the values.
- Provider success is not proven in this release because the owner prohibited
  paid test calls.
- Volcengine dubbing, provider replacement, storage migration, queue migration,
  and changes to organization-scoped data are out of scope unless separately
  approved.

## 7. Must-not rules

- Do not issue paid provider operations during verification.
- Do not bypass consent, ownership, catalog activation, plan, or credit checks.
- Do not accept a client-supplied price or broaden access by changing
  organization-scoped data.
- Do not claim a provider-side flow works without a paid end-to-end test.

## 8. Traceability summary

The authoritative machine-readable matrix is `.ilana/traceability.csv`.
