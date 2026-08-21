# Marathon rules

Everything in [/AGENTS.md](../../AGENTS.md) still applies. This adds what's
specific to running autonomously for a fixed 3-hour window with the owner not
watching every step.

## What never needs the owner mid-session

- Reading code, writing code, committing to a feature branch, pushing that
  branch, opening a PR.
- Running the type checker, linter, build, and local dev server to verify.
- Fixing something SCOPE.md already lists.
- Merging PRs that are pure additions the owner has already asked for this
  session (matches the established pattern from earlier today: work, verify,
  commit, push, open PR, merge once green).

## What always needs the owner, even mid-marathon

- Spending real money: starting a video-generation render (credits are
  limited, non-refundable, and this rule has held all session), any paid API
  call outside normal dev traffic, any billing-plan change.
- Deploying to production manually. Prefer fixing the CI auto-deploy gap
  (SCOPE.md item 1) over repeating `vercel deploy --prod` by hand; if a manual
  deploy is genuinely needed before that's fixed, ask first, the same way it
  was asked for earlier this session.
- Anything destructive or hard to reverse: force-push, `git reset --hard` on a
  branch with real work, deleting a branch, dropping/altering a live database
  table, rewriting shared history.
- Adding a new dependency, or a new third-party service/API key.
- Any change to auth, RLS policies, or anything security-boundary-shaped —
  needs a second look even from inside this session (Reviewer role is not a
  substitute for the owner here).

If the owner is unreachable and a real blocker hits one of the "always needs
the owner" items, stop that thread and move to the next SCOPE.md item rather
than working around the blocker. Log what's blocked and why so it's the first
thing read when the owner returns.

## Verification discipline

Every claim of "done" needs proof attached, not asserted: paste the actual
type-check/lint/build output, or a screenshot from the real running app for
anything visual (this session already learned that a fix can be correct in
the code and still invisible in production because of a stale deploy — check
the actual running surface, not just the diff). Never mark a SCOPE.md item
done on the strength of "this should work now."

## Guessing

If a bug's cause isn't understood, say that plainly rather than trying a fix
and seeing if it helps. A fix without a diagnosis is a coin flip that looks
like progress until it silently doesn't hold.

## Cadence

Work in complete, reviewed units — implement, verify, commit — rather than
batching multiple unrelated changes into one commit or one PR, even under time
pressure. A 3-hour session that ships 15 clean, small, reviewed PRs is a
better outcome than one that ships 3 giant ones nobody can review.

Check SCOPE.md's running total periodically and log progress there (or in a
session note alongside it) so a 3-hour session interrupted at any point leaves
a readable trail of what got done, what's in flight, and what's next — the
same reason this file exists in the first place: so continuing doesn't depend
on memory that isn't there.

## No AI slop, anywhere

Applies to code, comments, commit messages, PR descriptions, and any
user-facing copy touched this session: no em dashes, no AI/assistant
attribution in any commit or PR, no generic filler language. This has held
all session; it holds for the next three hours too.
