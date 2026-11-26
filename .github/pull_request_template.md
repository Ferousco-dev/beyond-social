## What changed

<!-- One or two sentences, in plain words. -->

## Proof

<!--
Show it working, from the running app: screenshots or a short video of every
screen this touches (desktop and phone width), and the checks that ran.
CI fails the pull request when this section has no image or video, unless the
box below is ticked.
-->

- [ ] No visible change (server or tooling only); the tests below prove it.

## Checks run

- [ ] `pnpm --filter @beyond-social/web typecheck lint test guard`
- [ ] `go test ./...` (server changes)

## New checks

<!-- Every correction becomes a check. Name the guard or test this adds. -->
