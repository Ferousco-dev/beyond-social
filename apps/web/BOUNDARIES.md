# Where code goes in this app

Three rules, and the one that is actually load-bearing is the third.

```
src/app          routing only — pages and route handlers that delegate
src/features/X   everything that belongs to one feature, including its lib/
src/lib          code two or more features import
```

**`src/lib` is a claim, not a shelf.** Putting a file there says "at least two
features need this." The claim is checkable — `python3 tools/relocate-lib.py plan`
prints, per module, who imports it and what that implies — and when it is false the
module belongs to one feature and should move into it.

This is not a style preference. `src/lib` reached 19,010 lines, and 8,868 of them
sat in directories whose names were identical to a directory in `src/features`: the
same concern, split across two trees, with nothing deciding which half went where.
Five modules (`script`, `editor`, `onboarding`, `settings`, `voice`) were moved into
their feature, and that pass found **20 byte-identical files duplicated between the
two trees** — `features/editor/lib/schema.ts` and `lib/editor/schema.ts`, both
present, one of them dead. Nobody could tell which one a change should touch by
reading either.

## Deciding where something new goes

1. Imported by one feature → `src/features/<feature>/lib`.
2. Imported by two or more → `src/lib`, and its name must describe the _thing_, not
   the feature that introduced it. `lib/credits-ledger`, not `lib/billing`.
3. Imported by `src/lib` itself → it is infrastructure; it stays in `lib` whatever
   its name looks like.

Rule 3 is the one that saves you from a bad move. `lib/generation` looks like the
generation feature's files in the wrong place and is not: six scopes import it. Same
for `lib/billing` (nine), `lib/chat`, `lib/dashboard`. A name that matches a feature
directory is a hypothesis; the import graph is the evidence.

`lib/supabase` (3,435 lines, 23 importers), `lib/logger`, `lib/env` and `lib/utils`
are the genuine core and are not going anywhere.

## Working with a feature that has outgrown its folder

`features/dashboard` is 6,700 lines — larger than 25 of the 26 features. Splitting a
folder like that is a real refactor with real risk, so the rule here is only that the
boundary is _visible_: one folder per feature, and `lib/` inside it for the parts
that are not UI. That is what makes the next split a mechanical step rather than an
archaeology dig.

## After moving anything

```bash
pnpm --filter @beyond-social/web typecheck && pnpm --filter @beyond-social/web lint
```

Both are the check, not a formality. The moves are mechanical and the aliases make
them complete — every cross-directory import here goes through `@/`, so a missed
specifier is a compile error rather than a runtime surprise — but `apps/web/scripts`
imports the app by _relative_ path, which is how one file escaped the rewrite and
only showed up in `tsc`.
