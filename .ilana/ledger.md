# Ìlànà ledger

## 2026-09-16 | G0 | conductor | INTAKE

Mode: FLEET. Rigour: 3, because this is a production SaaS handling faces, voice recordings, social credentials, and billable provider requests.

Assumptions:
  - DEC-001: The release goal is to make the currently designed AI capabilities usable by Creator testers.
  - DEC-002: Normal SaaS privacy safeguards apply. Existing consent, ownership, and server-side validation controls remain mandatory.
  - DEC-003: Tester accounts retain a 500-credit balance target; implementation must not create unlimited spend.
  - DEC-004: The model picker defaults to Auto and offers recommended and advanced choices with input requirements and credit costs.
  - DEC-005: HeyGen prices will be conservative tester prices based on current official provider rates, recorded before enabling the gates.
  - DEC-006: Verification is local and non-billable. No paid provider calls occur without a separate instruction.

Open: CR-001, complete advanced AI feature wiring and test coverage.

Implementation note:
  - DEC-007: HeyGen credit secrets remain unset until the current official API rate and product-credit conversion are recorded. The existing fail-closed behavior is retained.
