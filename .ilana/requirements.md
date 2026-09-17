# CR-001 requirements register

## Elicitation record

- Owner interview, 2026-09-16: unlock every advanced AI capability for Creator
  testers, add Auto plus explicit model selection, and require a driving video
  with one or more images for reference-to-video.
- Repository analysis, 2026-09-16: inspected catalog, plan, generation routing,
  avatar, and HeyGen pricing-gate code.
- Owner constraint, 2026-09-16: no paid provider test calls; verify predictively
  through non-billable checks only.

## Requirement index

| ID | Requirement | Priority | Source | Verification |
| --- | --- | --- | --- | --- |
| REQ-001 | Creator access to active advanced models | must | Owner interview | TC-001, TC-002 |
| REQ-002 | Auto, Recommended, and Advanced model picker | must | Owner interview | TC-003, TC-004 |
| REQ-003 | Auto routes image + voice + prompt to avatar models | must | Owner interview | TC-005, TC-006 |
| REQ-004 | Reference video plus image-reference flow | must | Owner interview | TC-007, TC-008 |
| REQ-005 | Server-side validation, consent, ownership, and credits | must | Owner and repo analysis | TC-009, TC-010 |
| REQ-006 | Configured HeyGen twin-video and voice-clone price gates | must | Owner interview | TC-011, TC-012 |
| REQ-007 | Non-billable verification only | must | Owner instruction | TC-013 |
| NFR-001 | Every selectable model discloses cost and inputs | must | Owner interview | TC-003 |
| NFR-002 | Invalid requests have zero debit and provider calls | must | Repo analysis | TC-009, TC-010, TC-012 |
| NFR-003 | Sensitive media stays authenticated, owned, consented | must | Owner and repo analysis | TC-010 |
| DOM-001 | Likeness and voice consent controls | must | Normal SaaS baseline | TC-010 |
| DOM-002 | Server-enforced provider and billing controls | must | Repo analysis | TC-009, TC-011, TC-012 |

## Open implementation decision

**DEC-007: HeyGen credit values.** The owner asked for conservative tester pricing,
but the current official provider rate must be captured before a value is set.
The release may set only positive integer costs that document their rate source,
calculation date, and USD 0.05-per-credit conversion. Until then, both gates
remain fail-closed.

## Handoff

```text
HANDOFF
  from: analyst
  to: architect
  gate: G1 pending review
  produced: docs/srs.md, .ilana/requirements.md, .ilana/traceability.csv
  ids: REQ-001..REQ-007, NFR-001..NFR-003, DOM-001..DOM-002
  open: DEC-007 requires current official HeyGen pricing evidence
  assumed: DEC-001..DEC-006
  next: map requirements to model catalog, routing, UI, and Edge Function designs
```
