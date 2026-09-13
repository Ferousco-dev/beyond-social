# Repo split

**Status: executed.** Nine standalone repos built from this checkout, each with its real history
rewritten to its new paths, each installing and typechecking on its own. `tools/split-repos.sh`
regenerates them; output lands in `../split/<name>`, outside git on purpose — nested repos do not
belong in a repo.

Measured against `main` at `971bdcb`: 584 commits, 2,255 files. Note this checkout was cloned shallow
(one commit); `git fetch --unshallow` was needed before any of this, or every split repo would have
started with a single commit and the history would have been silently lost.

## Layout

`website` `admin` `prompts` `supabase` `shared` `worker` `render` `mail` `sdk` — as specified. The
paths in your table were conceptual, so here is the mapping the tool actually uses:

| Your name | Real path in the monorepo                                              | LOC    | Files | Commits | Split repo gets         |
| --------- | ---------------------------------------------------------------------- | ------ | ----- | ------- | ----------------------- |
| website   | `apps/web`                                                             | 59,101 | 653   | **339** | root, lifted            |
| admin     | `apps/admin`                                                           | 9,991  | 174   | 13      | root, lifted            |
| prompts   | `prompts` + `packages/prompt-engine`                                   | 47,752 | 1,095 | 7 + 15  | both kept in place      |
| supabase  | `supabase`                                                             | 14,644 | 158   | 92      | root, lifted            |
| shared    | `packages/{ai-gateway,env,rate-limit,eslint-config,typescript-config}` | 4,654  | 67    | 41      | `packages/*`            |
| worker    | `apps/worker`                                                          | 2,187  | 33    | 21      | root, lifted            |
| render    | `services/render`                                                      | 553    | 12    | 6       | root, lifted            |
| mail      | `services/mail`                                                        | 593    | 17    | 4       | root, lifted            |
| sdk       | `packages/sdk`                                                         | 240    | 5     | **1**   | root, lifted            |
| —         | `docs`                                                                 | 7,391  | 29    | **117** | **nothing — see below** |

## How the packages cross the boundary

This was the real decision, and the answer is not one policy. Before any of it, every internal
package resolved to raw source with no build:

```jsonc
// packages/ai-gateway/package.json — identical shape in env, rate-limit, sdk, prompt-engine
"exports": { ".": { "types": "./src/index.ts", "default": "./src/index.ts" } },
"scripts": { "lint": "...", "typecheck": "..." }   // no build, no dist/, no files[]
```

That only works because pnpm symlinks the source into `node_modules` and `apps/web/next.config.ts`
names it in `transpilePackages`. There is no symlink and no shared bundler config across a repo
boundary, so "versioned packages" is a job, not a label.

| Package                              | Crossing                                                                       | Reason                                                                                                                                                                                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ai-gateway`                         | **published** — tsup, `dist/` + `dist/index.d.ts`, tag-triggered `publish.yml` | 4,142 lines, 25 commits, two test suites. Real behaviour with real tests; a version range is the honest contract and the tag is what a consumer can roll back to.                                                                                                                               |
| `prompt-engine`                      | **published, from `prompts`**                                                  | Your table said "prompt library **and prompt engine**" and it was right. `validate`/`ingest` read `../../prompts`; keeping both in one repo means that path stays correct and needs no surgery. Engine-in-`shared`, data-in-`prompts` — reading the table too literally — would have broken it. |
| `env` (26 lines) `rate-limit` (224)  | **vendored** into each consumer's `vendor/`                                    | A release cycle to change a zod schema is ceremony with a body count. Import specifiers never change, because the copy is a workspace member. Each carries `VENDORED.md` naming its origin.                                                                                                     |
| `eslint-config`, `typescript-config` | **vendored** everywhere                                                        | Dev-only, never versioned. Also what makes 8 of 9 repos install with **no registry credentials at all**.                                                                                                                                                                                        |

Vendored copies ship raw `src/*.ts`, so consumers must name them in `transpilePackages`; the tool
merges into an existing array rather than assuming there is none. `vendor-refresh <repo>` re-pulls
them and re-normalizes the package.json, so the refresh is idempotent and deterministic.

**Turbo was dropped rather than carried over.** It earns its keep scheduling 12 workspaces with
remote caching; across two or five packages `pnpm -r` is the same job with one less dependency, and
remote caching was never configured with a token anyway.

## Verified on a real install, not by reading

| Repo       | Commits | `pnpm install`                            | `typecheck`                                                                        |
| ---------- | ------- | ----------------------------------------- | ---------------------------------------------------------------------------------- |
| `website`  | 389     | needs `NPM_READONLY_TOKEN`                | **green** against `dist/` + `.d.ts`, with local links standing in for the registry |
| `admin`    | 20      | offline                                   | green                                                                              |
| `prompts`  | 24      | offline                                   | green                                                                              |
| `supabase` | 107     | n/a (Deno + SQL)                          | `deno check` in CI                                                                 |
| `shared`   | 34      | offline                                   | green — `ai-gateway` → `dist/index.js` 57 kB + `dist/index.d.ts` 43 kB             |
| `worker`   | 25      | offline                                   | green                                                                              |
| `render`   | 7       | `--ignore-scripts` (ffmpeg needs network) | green                                                                              |
| `mail`     | 4       | offline                                   | green                                                                              |
| `sdk`      | 1       | offline                                   | green                                                                              |

Three bugs were caught by running this, and each one is the type that shows up at deploy time:
tsup's declaration pass dies on `incremental` inherited from the shared tsconfig (`TS5074`, and no
`.d.ts` is emitted at all, so the published package would have been untyped); trimming
`import path` from `next.config.ts` broke the `path.dirname` two lines below it; and the first pass
skipped `transpilePackages` in `website` because an array already existed, leaving the vendored
limiter uncompiled.

Also fixed in the split repos, because both are silent:

- `outputFileTracingRoot` was `path.join(__dirname, "..", "..")`, which named the workspace root so
  Next could trace the lockfile. In a standalone repo that points outside the checkout — not an
  error, just a bundle missing files in production. Now the repo root.
- `apps/web/scripts/retrieval-eval.ts` read `../../prompts/evaluations/golden-queries.json`; it now
  takes `PROMPTS_DIR`.

## `apps/web` — what a repo split cannot touch

59k lines and 58% of all history go into one repo, so the boundaries inside it were done too. See
`apps/web/BOUNDARIES.md` and `tools/relocate-lib.py`.

`src/lib` was 19,010 lines and **8,868 of them sat in directories named exactly like a directory in
`src/features`** — one concern split across two trees with nothing deciding which half went where.
The rule is the import graph, not the name, and it disagrees more often than you would expect:
`lib/billing` (9 importers), `lib/generation` (6), `lib/chat`, `lib/memory`, `lib/dashboard` share a
feature's name and are genuinely shared, so they stay. Five modules — `script`, `editor`, `onboarding`,
`settings`, `voice`, 1,726 lines — moved into their feature; 41 files' aliases were rewritten.

Doing it found **20 byte-identical files duplicated across the two trees** (`features/editor/lib/schema.ts`
and `lib/editor/schema.ts`, both present, one dead; likewise in `script`, `onboarding`, `settings`,
`voice`), and no reader of either copy could tell which one a change belonged to. Net diff: 61 files,
+55 −1,781. Afterwards `typecheck`, `lint`, a full `next build`, and `test:script` / `test:brief` are
green.

## One command

`tools/split-run-all.sh` does the whole thing: preflight, unshallow, build the nine,
`pnpm install` each one to produce its lockfile, format and commit that, verify every
repo the way its CI will, create the repos in the org, push. Re-runnable, and
`DRY_RUN=1` stops before it touches GitHub.

It runs the split in **bootstrap mode** (`SPLIT_VENDOR_ALL=1`), which vendors
`ai-gateway` and `prompt-engine` the same way it vendors `env`, instead of expecting
them on a registry. That is the difference between "nine green repos tonight" and
"blocked until a release exists and a `read:packages` PAT is in nine CI configs and
both Vercel projects". `shared` keeps its `publish.yml`, so you can flip to the real
version boundary whenever you want it; until then the trade is that a fix in `shared`
does not reach `website` on its own, and `vendor-refresh` is how you pull it.

Vendored copies carry no `scripts` and are excluded from `lint` and `format:check` in
the consumer — 4,000 lines of another repo's code that this repo's tooling would
otherwise fail on, and `ai-gateway`'s own smoke tests typechecked inside `website`
produced exactly that: a red build here for a problem there.

## What is left for you

I cannot push: the token in this sandbox is a bot with `pull: false` on `Ferousco-dev/beyond-social`
and no rights on `Beyond-Social` — repo creation returns 403. Seeding the org and pushing are yours:

```bash
# 1. Create the nine repos.
for r in website admin prompts supabase shared worker render mail sdk; do
  gh repo create "Beyond-Social/$r" --private --description "$(sed -n '3p' ~/split/$r/README.md)"
done

# 2. Push them, each with its history.
REMOTE_BASE=https://github.com/Beyond-Social OUT=~/split bash tools/split-repos.sh push

# 3. Per repo: the lockfile, which cannot be split — one file covered every workspace,
#    so filter-repo drops it from all nine and `--frozen-lockfile` fails without it.
cd ~/split/<name> && pnpm install && git add -f pnpm-lock.yaml \
  && git commit -m "chore: generate lockfile for the standalone repo"
```

Then, per repo, none of it code:

- **Vercel** — re-point `website` and `admin` and clear the Root Directory override (each app is now
  the repo root). Every env var is re-entered by hand, which is also the moment you find out which
  ones the app reads that the old project never set.
- **`NPM_READONLY_TOKEN`** (PAT with `read:packages`) on `website` and in Vercel — `pnpm install`
  cannot resolve a private GitHub Packages scope without it, and the failure is a 401 naming no package.
- **Fly** — `worker` and `render` each need their own app plus secrets; `fly.toml` came along.
- **Supabase** — `supabase link --project-ref` from the new repo. `config.toml` is the source of
  truth for which functions verify JWTs, so deploy from there and re-check `supabase functions list`;
  that setting has been wrong before and a successful deploy does not show it.
- **`docs/` is homeless**: 7,391 lines, 117 commits, no row in your table. It stayed in the monorepo
  and each new README points there. A `Beyond-Social/docs` repo is 20 minutes if you want the
  runbooks out of the archive.
- **Keep the monorepo, archived read-only.** The 222 issues and PRs are the only record of _why_ the
  awkward code is awkward, and they cannot be split — `Merge pull request #222` in a commit message
  still reads as a number, but resolves against the new repo where #222 is something else or nothing.

## The 5-repo argument, kept on purpose

`sdk` is its own repo with **one commit in its entire history**. `mail` has 4, `render` 6, `prompts` 7. Nine repos means nine lockfiles, nine CI setups, nine audit surfaces, and nine places to rotate a
secret, to isolate five folders that have never changed independently — and `website` still contains
all 59k lines that made this feel like too much in the first place.

`SPLIT_TARGET=recommended bash tools/split-repos.sh all` builds the 5-repo version (`website`,
`admin`, `supabase`+`prompts`, `shared`, `services`) whenever you want to compare them side by side.
The four folders it merges are exactly the ones the commit counts above are about.

## Per-repo details

Each repo got, from the tools: its own `package.json` (name, `packageManager`, `engines`, prettier),
`pnpm-workspace.yaml` **with the root `overrides`/`allowBuilds`/`onlyBuiltDependencies` copied
verbatim** — those are the `ioredis`/`sharp`/`postcss`/`esbuild` security floors and dropping one
silently reopens an advisory — plus `.editorconfig`, `.gitattributes`, `.npmrc`, `.nvmrc`, prettier
and `.prettierignore`, `.gitleaks.toml`, `.vercelignore`, `LICENSE`, `CODEOWNERS`, a `.gitignore`,
a `README.md`, a `ci.yml` and `security.yml` with `turbo run` and `pnpm --filter` flattened into
direct commands, and an `AGENTS.md` carrying a banner that the old one describes paths that are gone.
`shared` also gets `publish.yml`; `supabase` gets `database.yml` and `edge-functions.yml` instead of
`ci.yml`.

Two things deliberately left in place rather than papered over:

- `packages/prompt-engine`'s `validate` reads `../../prompts`. Correct in the `prompts` repo, which
  has both. Do not "fix" it.
- `supabase/functions/_shared` imports nothing from `packages/` (checked). The edge functions are the
  one tree that split for free.
