#!/usr/bin/env bash
#
# Everything the split needs, in one run: build the nine repos, give each one a
# lockfile, make its first CI green, create it in the org, and push it.
#
# Safe to re-run. Existing repos are pushed to, not recreated; work already done is
# skipped and said so. Nothing here touches Ferousco-dev/beyond-social except reading it.
#
#   bash tools/split-run-all.sh
#   DRY_RUN=1 bash tools/split-run-all.sh     # build + verify, create nothing, push nothing
#   ORG=some-other-org bash tools/split-run-all.sh
#
# Needs: gh authenticated as an account that can create repos in $ORG, node >=22,
# pnpm (corepack is used if absent), and network for the dependency install.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${OUT:-$(dirname "$ROOT")/bs-split}"
ORG="${ORG:-Beyond-Social}"
DRY_RUN="${DRY_RUN:-0}"
REPOS=(website admin prompts supabase shared worker render mail sdk)
FAILED=()
SKIPPED=()

log()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$*"; }
die()  { printf '\n\033[31mstopped:\033[0m %s\n\n' "$*" >&2; exit 1; }

cd "$ROOT" || die "cannot cd to $ROOT"

# ---------------------------------------------------------------------------
log "0/6  preflight"

command -v git >/dev/null || die "git missing"
GITDIR="$(git rev-parse --git-dir)"
[ -n "$GITDIR" ] || die "not inside a git repo; run this from a checkout of beyond-social"

# A token that cannot read /user returns a JSON error body with exit 0, so the
# value has to look like a login and not like a response. Checking only "is it
# non-empty" reported a 403 payload as an authenticated user.
WHO="${GH_WHO_OVERRIDE:-}"
if [ -z "$WHO" ]; then
  WHO="$(gh api user --jq .login 2>/dev/null | grep -Ev '^\{|^$|^Error' | head -1 || true)"
fi
if [ -z "$WHO" ]; then
  # A fine-grained PAT with no user-email scope cannot read /user but can still
  # create repos, so gh's own view of the login is a legitimate second source
  # rather than a reason to stop a run that would have worked.
  WHO="$(gh auth status 2>&1 | sed -n 's/.* as \([A-Za-z0-9._-]*\).*/\1/p' | head -1 || true)"
  [ -n "$WHO" ] && warn "could not read /user; using the login from 'gh auth status' ($WHO)"
fi
[ -n "$WHO" ] || die "gh is not authenticated. Run: gh auth login"
ok "authenticated as $WHO"

gh api "orgs/$ORG" --jq '"can see \(.login)"' >/dev/null 2>&1 \
  || die "cannot see the org '$ORG' as $WHO. It must exist and you must be able to create repos in it."
# The permission that actually matters is create, and the only way to ask without
# side effects is to send a request that fails for a different reason.
CODE=$(gh api -X POST "orgs/$ORG/repos" -f name= --cache nil -i 2>/dev/null | head -1 | grep -o '[0-9]\{3\}' || echo 000)
case "$CODE" in
  422) ok "$WHO may create repos in $ORG" ;;
  403 | 404) die "$WHO cannot create repos in $ORG (HTTP $CODE). Add the Admin or repo-creation permission, or set ORG= to one you own." ;;
  *) warn "could not confirm repo-creation rights (HTTP $CODE); continuing, and creation will fail loudly if it is wrong" ;;
esac

if ! command -v node >/dev/null; then die "node missing (needs >=22)"; fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 22 ] || die "node $NODE_MAJOR found, this project needs >=22"
ok "node $(node --version)"

if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || npm i -g pnpm@11.5.1 >/dev/null 2>&1
fi
command -v pnpm >/dev/null 2>&1 || die "pnpm missing and corepack could not provide it"
ok "pnpm $(pnpm --version 2>/dev/null | tail -1)"

if ! command -v git-filter-repo >/dev/null 2>&1 && ! git filter-repo --version >/dev/null 2>&1; then
  warn "git-filter-repo missing; installing"
  FR_HOME="$HOME/.cache/beyond-social-split-venv"
  # Three routes, because the first one is blocked on any recent Debian/Ubuntu and
  # the failure looks like a broken script rather than a policy: pipx if present,
  # then a user install, then a private venv that needs nothing from the system.
  pipx install git-filter-repo >/dev/null 2>&1 \
    || python3 -m pip install --user --quiet git-filter-repo >/dev/null 2>&1 \
    || python3 -m pip install --user --quiet --break-system-packages git-filter-repo >/dev/null 2>&1 \
    || { python3 -m venv "$FR_HOME" >/dev/null 2>&1 \
         && "$FR_HOME/bin/pip" install --quiet git-filter-repo >/dev/null 2>&1; }
  export PATH="$HOME/.local/bin:$PATH"
  if command -v git-filter-repo >/dev/null 2>&1 || git filter-repo --version >/dev/null 2>&1; then
    :
  elif [ -x "$FR_HOME/bin/git-filter-repo" ]; then
    # split-repos.sh honours FILTER_REPO, so a venv install works without touching PATH.
    export FILTER_REPO="$FR_HOME/bin/git-filter-repo"
  else
    die "could not install git-filter-repo. Do it yourself, then re-run:
    pipx install git-filter-repo   # or: python3 -m venv ~/.frenv && ~/.frenv/bin/pip install git-filter-repo
    and set FILTER_REPO=~/.frenv/bin/git-filter-repo"
  fi
fi
ok "git-filter-repo ready"

# ---------------------------------------------------------------------------
log "1/6  full history"

# Shallow is the quiet failure here: filter-repo would happily produce nine repos
# that each contain exactly one commit, and the 584-commit history would be
# unrecoverable from this clone afterwards.
if [ -f "$GITDIR/shallow" ]; then
  warn "this clone is shallow; unshallowing (584 commits) — every split repo needs the real history"
  git fetch --unshallow >/dev/null 2>&1 || git fetch --unshallow origin >/dev/null 2>&1 \
    || die "git fetch --unshallow failed; the split cannot preserve history from a shallow clone"
fi
COUNT="$(git rev-list --count HEAD)"
[ "$COUNT" -gt 100 ] || die "only $COUNT commits on $(git rev-parse --abbrev-ref HEAD); expected 500+. Refusing to build history-less repos."
ok "$COUNT commits, branch $(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD)"

# ---------------------------------------------------------------------------
log "2/6  build the nine repos into $OUT"

# Bootstrap mode: every internal package is vendored, so no repo needs a GitHub
# Packages token and no release has to exist before the first install works.
rm -rf "$OUT"
SPLIT_VENDOR_ALL=1 OUT="$OUT" bash tools/split-repos.sh all >"$OUT.log" 2>&1 \
  || die "split-repos.sh failed; see $OUT.log"
ok "built: $(ls "$OUT" | tr '\n' ' ')"

# ---------------------------------------------------------------------------
log "3/6  install (this writes each lockfile), format, and commit it"

for r in "${REPOS[@]}"; do
  d="$OUT/$r"
  [ -d "$d" ] || { FAILED+=("$r (not built)"); continue; }
  ( cd "$d" && git add -A >/dev/null 2>&1 )
  if ! ( cd "$d" && pnpm install >"$d/.install.log" 2>&1 ); then
    # --ignore-scripts is the difference between "works" and "cannot continue" for
    # render and worker, whose ffmpeg-static downloads a binary at install time.
    # Anything else that failed for a real reason still fails here.
    if ( cd "$d" && pnpm install --ignore-scripts >"$d/.install.log" 2>&1 ); then
      warn "$r installed with --ignore-scripts (native binary download skipped)"
    else
      bad "$r install failed: $(grep -m1 -E 'ERR_[A-Z_]+' "$d/.install.log" | tr -d '\n')"
      FAILED+=("$r (install)")
      continue
    fi
  fi
  if [ -f "$d/package.json" ] && grep -q '"format"' "$d/package.json"; then
    ( cd "$d" && pnpm run format >/dev/null 2>&1 )
  fi
  ( cd "$d" && git add -A \
      && git diff --cached --quiet \
      || git -c user.name="$WHO" -c user.email="$WHO@users.noreply.github.com" \
           commit -q -m "chore: lockfile and formatting for the standalone repo

Generated by tools/split-run-all.sh. The monorepo's single pnpm-lock.yaml covered
every workspace, so it could not be split and every repo had to produce its own." )
  if [ -f "$d/pnpm-lock.yaml" ]; then
    ok "$r — lockfile $(wc -l < "$d/pnpm-lock.yaml" | tr -d ' ') lines"
  else
    ok "$r — no JS workspace, nothing to lock"
  fi
done

# ---------------------------------------------------------------------------
log "4/6  verify each repo the way its CI will"

for r in "${REPOS[@]}"; do
  d="$OUT/$r"
  # The gate is whether the repo declares the script, not whether tsc is in its
  # root node_modules: in a packages/* repo the compiler sits in each package, and
  # gating on the binary silently skipped the two repos that most needed checking.
  grep -q '"typecheck"' "$d/package.json" 2>/dev/null \
    || { SKIPPED+=("$r (no JS scripts)"); continue; }
  line="$r"
  for s in format:check lint typecheck; do
    grep -q "\"$s\"" "$d/package.json" 2>/dev/null || { line="$line  $s=·"; continue; }
    if ( cd "$d" && timeout 900 pnpm run "$s" >"$d/.$s.log" 2>&1 ); then
      line="$line  $s=ok"
    else
      line="$line  $s=FAIL"
      FAILED+=("$r ($s)")
    fi
  done
  ok "$line"
done

if [ "${#FAILED[@]}" -gt 0 ]; then
  printf '\n'
  for f in "${FAILED[@]}"; do bad "$f"; done
  die "the split is built but not clean. Fix the above (logs are the hidden .*log files in each repo) and re-run. Nothing was pushed."
fi

# ---------------------------------------------------------------------------
if [ "$DRY_RUN" = "1" ]; then
  log "5/6  and 6/6  skipped (DRY_RUN=1)"
  printf '  built and verified in %s. To create and push: bash tools/split-run-all.sh\n\n' "$OUT"
  exit 0
fi

log "5/6  create $ORG/<repo> as needed"

for r in "${REPOS[@]}"; do
  if gh repo view "$ORG/$r" >/dev/null 2>&1; then
    warn "$ORG/$r already exists; pushing to it"
    continue
  fi
  desc="$(sed -n '3p' "$OUT/$r/README.md" 2>/dev/null | cut -c1-180)"
  gh repo create "$ORG/$r" --private --description "$desc" >/dev/null 2>&1 \
    && ok "created $ORG/$r" || FAILED+=("create $ORG/$r")
done
[ "${#FAILED[@]}" -eq 0 ] || die "some repos could not be created; nothing pushed"

# ---------------------------------------------------------------------------
log "6/6  push"

for r in "${REPOS[@]}"; do
  d="$OUT/$r"
  ( cd "$d" \
    && git remote remove origin >/dev/null 2>&1
    git remote add origin "https://github.com/$ORG/$r" \
    && git push -q -u origin HEAD:main ) \
    && ok "pushed $ORG/$r" || { bad "push failed for $r"; FAILED+=("push $r"); }
done

printf '\n\033[1m%s\033[0m\n' "done"
cat <<EOF

  Repos:     https://github.com/$ORG
  Each one:  history rewritten to its own paths, lockfile, green format:check +
             lint + typecheck, its own CI.

  Still yours, none of it code:
    1. Vercel  — point the two existing projects at $ORG/website and /admin and
       CLEAR the Root Directory override (each app is the repo root now). Env vars
       are re-entered by hand; that is also when you find the ones nobody set.
    2. Fly     — new apps for worker and render, then 'fly secrets set'.
    3. Supabase— 'supabase link --project-ref <ref>' in $ORG/supabase, deploy the
       functions, then 'supabase functions list' to confirm which verify JWTs.
    4. Archive Ferousco-dev/beyond-social read-only. Do not delete it: the 222
       issues and PRs are the only record of why the awkward code is awkward.

  Vendored packages (bootstrap mode) are copies, not live links. Fixes made in
  $ORG/shared do not reach $ORG/website. 'bash tools/split-repos.sh vendor-refresh
  website' pulls them, and docs/repo-split-plan.md explains the publish.yml that
  removes the need for it once you want a real version boundary.
EOF
