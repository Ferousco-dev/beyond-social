# Milestone state: CR-007 and CR-008 avatar lifecycle fixes

Ceremony standard. Step: complete. Base `3b617b5`, head `7496ad9` on `codex/product-hardening`; 25 dirty path(s).

## Completed
- MAINTAIN intake and scope guard
- HeyGen non-enterprise capability review
- Provider credit expiry alerts and admin editor
- Generation path verification and non-enterprise HeyGen gating
- Clickable profile avatar integrated into the Profile card
- Admin-editable privacy and terms coming-soon pages
- Status page redesign and browser verification
- Avatar creation entry point and new-avatar layout correction
- Isolated local stress test with disposable-account cleanup
- Desktop admin navigation remains visible while admin content scrolls
- New-avatar route no longer falls through to the existing avatar library
- Five-avatar maximum enforced in UI, server actions, Edge Function, and database
- Avatar empty state and recorder now share dashboard assets as one inline flow
- All avatar creation links now target dashboard assets
- Legacy avatar paths in stored chat replies render as clickable links
- Camera and microphone tracks stop after recording and on every recorder exit
- Avatar wizard exits loading and exposes retry when training returns an error
- Video-generation controls stay hidden while the avatar recorder is active

## Verified behavior
- Production build, lint, and typecheck pass
- Generation smoke 16/16, model routing smoke 27/27, product hardening smoke 7/7
- 25 accounts and 500 concurrent health checks completed without failures
- Admin sidebar typecheck and lint pass
- Avatar limit database test, product smoke, schema lint, typecheck, lint, and production build pass
- Inline avatar flow production build passes
- Legacy avatar link smoke test and typecheck pass
- Avatar lifecycle typecheck, lint, and production build pass

## Remaining
- none

## Known limitations
- No paid provider requests during verification
- Repository SQL tests do not emit TAP plans, so supabase test db exits unsuccessfully despite schema lint passing
- Custom Digital Twin creation remains unavailable until HeyGen Enterprise API access is configured

## Repository contradicted an earlier claim
- none

## Stop boundary (do not start)
- Only the ten requested product-hardening items; no unrelated roadmap work

## Next action
Owner review

## Latest evidence
| id | label | result | command |
| --- | --- | --- | --- |
| EV-016 | admin-sidebar-lint | PASS | pnpm --filter web lint |
| EV-015 | admin-sidebar-typecheck | PASS | pnpm --filter web typecheck |
| EV-027 | avatar-camera-build | PASS | pnpm build |
| EV-026 | avatar-camera-lint | PASS | pnpm --filter web lint |
| EV-025 | avatar-camera-typecheck | PASS | pnpm --filter web typecheck |
| EV-021 | avatar-flow-build | PASS | pnpm build |
| EV-019 | avatar-flow-smoke | PASS | pnpm --filter web test:product-hardening |
| EV-018 | avatar-flow-typecheck | PASS | pnpm --filter web typecheck |
| EV-022 | avatar-inline-flow-build | PASS | pnpm build |
| EV-030 | avatar-lifecycle-build | PASS | pnpm build |
| EV-017 | avatar-limit-db-test | PASS | psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERR |
| EV-020 | avatar-schema-lint | PASS | supabase db lint --local |
| EV-029 | avatar-wizard-lint | PASS | pnpm --filter web lint |
| EV-028 | avatar-wizard-typecheck | PASS | pnpm --filter web typecheck |
| EV-014 | final product hardening smoke | PASS | pnpm --filter web test:product-hardening |
| EV-013 | final web typecheck | PASS | pnpm --filter web typecheck |
| EV-006 | generation-smoke | PASS | pnpm --filter @beyond-social/web test:generation |
| EV-023 | legacy-avatar-link-smoke | PASS | pnpm --filter web test:product-hardening |
| EV-024 | legacy-avatar-link-typecheck | PASS | pnpm --filter web typecheck |
| EV-004 | local-migrations | PASS | supabase migration up --local |
| EV-011 | local-stress | PASS | zsh -lc set -a; eval "$(supabase status -o env 2>/dev/null)"; set +a;  |
| EV-007 | model-smoke | PASS | pnpm --filter @beyond-social/web test:model |
| EV-002 | next-typegen | PASS | pnpm --filter @beyond-social/web typegen |
| EV-005 | product-hardening-smoke | PASS | pnpm --filter @beyond-social/web test:product-hardening |
| EV-012 | web-typecheck | PASS | pnpm --filter @beyond-social/web typecheck |

Rendered from `.ilana/handoff.json`. Edit with `evidence.py handoff`, not by hand.
