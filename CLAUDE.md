# Beyond Social: working rules

Markdown cannot enforce anything, so these rules live in code and CI. This file
only says where. Run `pnpm --filter @beyond-social/web guard` to check them all.

## 1. Ban what agents misuse

`client/scripts/guards/ratchet.mjs` bans patterns agents get wrong:
`useEffect`, switching lint rules off, `dangerouslySetInnerHTML`, "for now" /
workaround notes, and `//` comments. Today's counts are frozen in
`baseline.json`: a file may only lose them, a new file has none. After removing
some, run `pnpm --filter @beyond-social/web guard:tighten` to lock the lower
count in. The baseline can never be raised by a tool.

Instead of a comment, make the code say it: a clear name, a type, a test, or a guard.

## 2. Review the proof, not the diff

Every pull request shows the change working: screenshots or a video from the
running app, desktop and phone width, under `## Proof` in the template. Server
or tooling changes tick "No visible change" and let the tests prove it.
`.github/workflows/proof.yml` fails a pull request without proof.

## 3. Every correction becomes a check

The fix and its check land together. A pattern (class, word, import, link)
becomes a rule in `client/scripts/guards/rules.mjs` with a test in
`rules.test.mjs` that shows it the original mistake. Behaviour becomes a
`*.test.ts` or `*_test.go` named after what must stay true. Never delete or
weaken a check to pass a build. A real exception is marked on its line:
`// guard-allow: <rule-id> (why)`.

New dependencies are checked too: anything not in
`client/scripts/guards/approved-deps.json` fails until the owner approves it.

CI (`.github/workflows/deploy.yml`) runs typecheck, lint, tests and guards for
the web app, and gofmt, vet, tests and govulncheck for the server, before any
deploy.

## 4. End to end, with nothing real spent

`e2e/stack.sh up` starts the whole product on this machine: a local Supabase
(`e2e/supabase`, never linked to the real project), the API, and
`server/cmd/fakeproviders` standing in for kie.ai, Apify and Gemini. Then
`pnpm --filter @beyond-social/web e2e` signs up with a real email code, opens
every page, presses every safe button, and runs the idea-to-editor-to-post
journey. Nothing is generated or paid for: `E2E_FAKE_PROVIDERS` points the
API at the fake, and production refuses to start with it.

CI runs this on every pull request and before every deploy. For an urgent fix,
run the workflow by hand with "fast" ticked: the other checks still run and the
summary says end to end was skipped. A new screen or flow gets a test in
`client/e2e`.

## Not yet a check

- Numbers that change over time are shown as graphs.
- Empty states and first screens use unDraw illustrations in the brand colours.
