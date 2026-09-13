#!/usr/bin/env bash
#
# Split this monorepo into standalone repositories, each keeping its real git history.
#
#   bash tools/split-repos.sh plan              # show the mapping, touch nothing
#   bash tools/split-repos.sh build web         # one repo into $OUT/web (safe to inspect)
#   bash tools/split-repos.sh all               # every repo in the active target
#   REMOTE_BASE=https://github.com/Beyond-Social bash tools/split-repos.sh push
#
#   bash tools/split-repos.sh vendor-refresh website   # re-pull vendor/* from the monorepo
#   SPLIT_TARGET=recommended bash tools/split-repos.sh plan  # the 5-repo alternative

# Default target is `theirs`: the nine-way split. docs/repo-split-plan.md argues
# for five and records why the choice was made; both layouts stay supported because
# the argument for five is mostly about the four folders nobody ever changes.
# (Backticks inside a shell comment are only a comment if every line keeps its #.)
#
# Point SRC at a `git clone --mirror` of the monorepo if you have one; it defaults to
# this checkout. filter-repo refuses to run anywhere but a fresh clone, so every repo
# is built from a throwaway copy and your working tree is never rewritten.
#
# Requires: git >= 2.22 and git-filter-repo (`pipx install git-filter-repo`).
#
# READ docs/repo-split-plan.md BEFORE PUSHING. Three things this script cannot fix:
#   1. packages/* resolve their exports to raw `src/*.ts` with no build step, so
#      `workspace:*` stays unresolvable across repos until they are published.
#   2. outputFileTracingRoot in both apps' next.config.ts is path.join(__dirname, "../.."),
#      which stops pointing at the lockfile once the app *is* the repo root.
#   3. The four workflows under .github/workflows are workspace-shaped (turbo, pnpm
#      --filter) and are not carried over. Each repo needs its own, de-turboed.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${SRC:-$(git -C "$REPO_ROOT" rev-parse --show-toplevel)}"
OUT="${OUT:-$(dirname "$SRC")/split}"

# Copied into every new repo: these only took effect from a workspace root today.
ROOT_FILES=(.editorconfig .gitattributes .npmrc .nvmrc .prettierrc.json
  .prettierignore .gitleaks.toml .vercelignore LICENSE AGENTS.md)

# ---------------------------------------------------------------------------
# Target specs:  name | pnpm-workspace globs | source rewrites
# Each rewrite is "old=>new"; a bare "old" keeps its path as-is. A single bare
# "old" with no globs is lifted to the repo root with --subdirectory-filter, so
# Vercel's Root Directory can stay unset.
# ---------------------------------------------------------------------------

TARGET_recommended='
web      |            | apps/web
admin    |            | apps/admin
supabase |            | supabase prompts
shared   | packages/* | packages
services | worker render mail | apps/worker=>worker services/render=>render services/mail=>mail
'

TARGET_theirs='
website  |            | apps/web
admin    |            | apps/admin
prompts  | packages/* | prompts packages/prompt-engine
supabase |            | supabase
shared   | packages/* | packages/eslint-config packages/typescript-config packages/env packages/ai-gateway packages/rate-limit
worker   |            | apps/worker
render   |            | services/render
mail     |            | services/mail
sdk      |            | packages/sdk
'

log() { printf '\033[36m==>\033[0m %s\n' "$*"; }
die() { printf '\n\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }

target_block() {
  local t="${SPLIT_TARGET:-theirs}"
  local var="TARGET_$t"
  [ -n "${!var:-}" ] || die "unknown SPLIT_TARGET '$t' (recommended | theirs)"
  printf '%s' "${!var}"
}

find_filter_repo() {
  [ -n "${FILTER_REPO:-}" ] && { echo "python3 $FILTER_REPO"; return; }
  # pipx puts it on PATH; pip's --user install registers it as a git subcommand.
  if command -v git-filter-repo >/dev/null 2>&1; then echo "git-filter-repo"; return; fi
  if git filter-repo --version >/dev/null 2>&1; then echo "git filter-repo"; return; fi
  for c in "$HOME/.local/bin/git-filter-repo" /opt/homebrew/bin/git-filter-repo /usr/local/bin/git-filter-repo; do
    [ -x "$c" ] && { echo "$c"; return; }
  done
  die "git-filter-repo not found. Install it: pipx install git-filter-repo"
}

# Root package.json rebuilt from the monorepo's so packageManager/engines and the
# prettier devDep do not drift between repos. The `overrides:` block from
# pnpm-workspace.yaml is copied in full: those are the ioredis/sharp/postcss/esbuild
# security floors, and dropping one silently reopens an advisory.
write_configs() {
  local dest="$1" globs="$2"

  python3 - "$dest" "$globs" "$SRC/package.json" <<'PY'
import json, os, sys
dest, globs, rpj = sys.argv[1], sys.argv[2].strip(), sys.argv[3]
root = json.load(open(rpj))
# An app lifted to the root keeps its own package.json (deps, scripts, name) and only
# gains the workspace-level fields, so `pnpm build` works there unchanged.
tgt = os.path.join(dest, "package.json")
d = json.load(open(tgt)) if os.path.exists(tgt) else {}
d.setdefault("name", "beyond-social-%s" % os.path.basename(os.path.normpath(dest)))
d.setdefault("version", root.get("version", "0.1.0"))
d.setdefault("license", root.get("license", "UNLICENSED"))
d["private"] = True
d["engines"] = root.get("engines", {})
d["packageManager"] = root.get("packageManager")
# Only prettier: every repo gets .prettierrc + format:check, so it needs the binary.
dd = d.setdefault("devDependencies", {})
if ".prettierrc.json" in os.listdir(dest):
    dd.setdefault("prettier", root["devDependencies"].get("prettier", "^3.4.2"))
if not dd:
    d.pop("devDependencies", None)
# Every repo needs prettier wired up: the generated CI runs `format:check`, and a
# missing script fails the pipeline as hard as a bad format does, with a worse error.
s = d.setdefault("scripts", {})
s.setdefault("format", "prettier --write \"**/*.{ts,tsx,js,jsx,mjs,cjs,json,md,css,yml,yaml}\"")
s.setdefault("format:check", "prettier --check \"**/*.{ts,tsx,js,jsx,mjs,cjs,json,md,css,yml,yaml}\"")
json.dump(d, open(tgt, "w"), indent=2)
open(tgt, "a").write("\n")
PY

  {
    printf '# Generated by tools/split-repos.sh.\n'
    printf '# Internal @beyond-social/* deps are still `workspace:*` and will NOT resolve\n'
    printf '# until those packages are published. See docs/repo-split-plan.md.\n'
    printf 'packages:\n'
    if [ -n "$globs" ]; then
      local g; set -f   # `packages/*` is a pattern to write out, not to expand
      for g in $globs; do printf '  - "%s"\n' "$g"; done; set +f
    else
      printf '  - "."\n'
    fi
    for key in overrides allowBuilds onlyBuiltDependencies; do
      [ -f "$SRC/pnpm-workspace.yaml" ] || break
      awk -v k="$key" 'index($0, k":")==1 {f=1} f && /^[^ #]/ && index($0, k":")!=1 {f=0} f {print}' \
        "$SRC/pnpm-workspace.yaml"
    done
  } > "$dest/pnpm-workspace.yaml"

  # Turbo is dropped rather than carried over. It earns its keep coordinating 12
  # workspaces with remote caching across a monorepo; in a repo with two or five
  # packages, `pnpm -r` does the same job with one less dependency to install, and
  # nothing is lost because remote caching was never configured with a token.
  if [ -n "$globs" ]; then
    python3 - "$dest/package.json" <<'INNER'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
s = d.setdefault("scripts", {})
s["build"] = "pnpm -r build"
s["lint"] = "pnpm -r lint"
s["typecheck"] = "pnpm -r typecheck"
s["test"] = "pnpm -r test"
json.dump(d, open(p, "w"), indent=2); open(p, "a").write("\n")
INNER
  fi

  printf 'node_modules\ndist\n.next\n.turbo\n.dev-logs\ncoverage\n*.log\n.env\n.env.local\n' > "$dest/.gitignore"

  if [ -f "$dest/AGENTS.md" ]; then
    python3 - "$dest/AGENTS.md" <<'PY'
import sys
p = sys.argv[1]; body = open(p).read()
open(p, "w").write(
    "<!-- SPLIT WARNING: copied verbatim from the monorepo root by tools/split-repos.sh.\n"
    "     Every path and command in here describes the old workspace layout, which no longer\n"
    "     exists in this repo. Rewrite this file before trusting an agent to it. -->\n\n" + body)
PY
  fi
}

build_one() {
  local name="$1" globs="$2"; shift 2
  local -a rewrites=("$@")
  local dest="$OUT/$name" FR; FR="$(find_filter_repo)"

  [ ${#rewrites[@]} -gt 0 ] || die "$name: no source paths in the target spec"
  [ -e "$SRC/.git" ] || die "$SRC is not a git repo (set SRC= to a --mirror clone of it)"

  log "$name"
  rm -rf "$dest"; mkdir -p "$OUT"
  git clone -q --no-hardlinks "$SRC" "$dest" || die "$name: clone of $SRC failed"

  local -a args=() lift=""
  if [ ${#rewrites[@]} -eq 1 ] && [ -z "$globs" ] && [[ "${rewrites[0]}" != *'=>'* ]]; then
    lift="${rewrites[0]}"
  else
    local spec o n
    for spec in "${rewrites[@]}"; do
      o="${spec%%=>*}"; n="$o"
      [[ "$spec" == *'=>'* ]] && n="${spec#*=>}"
      args+=(--path "$o")
      [ "$o" != "$n" ] && args+=(--path-rename "$o/:$n/")
    done
  fi

  if [ -n "$lift" ]; then
    ( cd "$dest" && $FR --subdirectory-filter "$lift" --force >/dev/null )
    log "  lifted $lift/ to the repo root"
  else
    ( cd "$dest" && $FR "${args[@]}" --force >/dev/null )
  fi

  # filter-repo drops `origin` deliberately. Keep a pointer to the monorepo so
  # `git log --follow` can still be reconciled against it, then drop it.
  git -C "$dest" remote add monorepo "$SRC" 2>/dev/null || true

  local f
  for f in "${ROOT_FILES[@]}"; do
    [ -f "$SRC/$f" ] && cp "$SRC/$f" "$dest/$(basename "$f")"
  done
  if [ -f "$SRC/.github/CODEOWNERS" ]; then
    mkdir -p "$dest/.github"; cp "$SRC/.github/CODEOWNERS" "$dest/.github/CODEOWNERS"
  fi

  write_configs "$dest" "$globs"

  # The filtered files and history are only half the job: workspace:* deps,
  # the tracing root, and the turbo-shaped CI all have to follow.
  if [ -f "$REPO_ROOT/tools/split-postprocess.py" ]; then
    REPO_ROOT="$SRC" python3 "$REPO_ROOT/tools/split-postprocess.py" "$OUT" "$name" \
      || die "$name: postprocess failed (the repo is built but will not install as-is)"
  fi

  local c n
  c="$(git -C "$dest" rev-list --count HEAD 2>/dev/null || echo 0)"
  n="$(find "$dest" -type f -not -path '*/.git/*' | wc -l | tr -d ' ')"
  if [ -n "$(git -C "$dest" status --porcelain)" ]; then
    git -C "$dest" add -A
    # Quoted delimiter on purpose: the message mentions `pnpm install` and an
    # unquoted heredoc would run that as a command substitution.
    git -C "$dest" -c user.name="repo-split" -c user.email="repo-split@local" commit -q -F - <<'MSG' 
chore: standalone repo setup after monorepo split

Adds the workspace config this repo used to inherit from the monorepo root:
package.json, pnpm-workspace.yaml (with the shared dependency overrides),
.gitignore, and the editor/security config. Turbo is deliberately left behind --
`pnpm -r` covers two or five packages without a task runner.

Still required before CI can go green: regenerate pnpm-lock.yaml here (the
monorepo's single lockfile covers every workspace and cannot be split), and
publish @beyond-social/* so the remaining ranges resolve.
See docs/repo-split-plan.md.
MSG
  fi
  log "  $c commits, $n files -> $dest"
}

# For `plan`: how many commits in the shared history touch each source path.
path_activity() {
  local p="$1"
  [ -d "$SRC/$p" ] || { printf 'n/a'; return; }
  git -C "$SRC" rev-list --count HEAD -- "$p" 2>/dev/null || printf 'n/a'
}

main() {
  local cmd="${1:-plan}"
  case "$cmd" in
    plan)
      printf 'source   %s\nout      %s\ntarget   %s\n\n' "$SRC" "$OUT" "${SPLIT_TARGET:-theirs}"
      local name globs rewrites g r p
      while IFS='|' read -r name globs rewrites _; do
        name="$(echo "${name// /}")"; [ -n "$name" ] || continue
        g="$(echo "${globs//  /}")"; r="$(echo "${rewrites//  / }")"
        printf '  %-9s ws[%-12s] %s\n' "$name" "${g:-none}" "$r"
        for p in $r; do
          printf '             %-14s %s commits\n' "${p%%=>*}" "$(path_activity "${p%%=>*}")"
        done
      done < <(target_block)
      printf '\nbuilt into %s, one git repo each, nothing pushed.\n' "$OUT"
      ;;
    build)
      [ $# -ge 2 ] || die "usage: ${BASH_SOURCE[0]} build <repo-name>"
      local name globs rewrites found=0
      while IFS='|' read -r name globs rewrites _; do
        name="$(echo "${name// /}")"; [ "$name" = "$2" ] || continue
        found=1
        # shellcheck disable=SC2086
        build_one "$name" "$(echo "${globs//  /}")" $(echo "${rewrites//  / }")
      done < <(target_block)
      [ "$found" -eq 1 ] || die "'$2' is not in target '${SPLIT_TARGET:-theirs}' (run: plan)"
      ;;
    all)
      local name globs rewrites
      while IFS='|' read -r name globs rewrites _; do
        name="$(echo "${name// /}")"; [ -n "$name" ] || continue
        # shellcheck disable=SC2086
        build_one "$name" "$(echo "${globs//  /}")" $(echo "${rewrites//  / }")
      done < <(target_block)
      log "built into $OUT — nothing was pushed"
      printf 'inspect one, then: REMOTE_BASE=https://github.com/Beyond-Social bash %s push\n' \
        "${BASH_SOURCE[0]}"
      ;;
    push)
      [ -n "${REMOTE_BASE:-}" ] || die "set REMOTE_BASE, e.g. REMOTE_BASE=https://github.com/Beyond-Social"
      local d n
      for d in "$OUT"/*/; do
        [ -d "$d/.git" ] || continue
        n="$(basename "$d")"
        log "pushing $n -> $REMOTE_BASE/$n"
        ( cd "$d" && git remote remove origin 2>/dev/null || true
          git remote add origin "$REMOTE_BASE/$n"
          git push -u origin HEAD:main )
      done
      ;;
    vendor-refresh)
      # Vendored copies drift. This is the only thing that keeps that from being
      # a one-way fork, and it is deliberately not automatic: a vendor directory
      # that silently overwrites local edits is worse than one that drifts visibly.
      [ -n "${2:-}" ] || die "usage: $0 vendor-refresh <repo-name>"
      local repo="$OUT/$2"
      [ -d "$repo/vendor" ] || die "$2 has no vendor/ directory"
      local v short n=0
      for v in "$repo"/vendor/*/; do
        [ -d "$v" ] || continue
        short="$(basename "$v")"
        if [ ! -d "$SRC/packages/$short" ]; then
          log "$short: not a monorepo package, leaving it"; continue
        fi
        rm -rf "$v"
        cp -R "$SRC/packages/$short" "$v"
        rm -rf "$v/node_modules" "$v/dist" "$v/.turbo"
        n=$((n + 1))
      done
      # Re-run the postprocess, not just the copy: a vendored package.json still
      # carrying `workspace:*` devDeps on packages this repo does not contain makes
      # `pnpm install` fail, and the refresh would have silently reintroduced it.
      [ -f "$REPO_ROOT/tools/split-postprocess.py" ] \
        && REPO_ROOT="$SRC" python3 "$REPO_ROOT/tools/split-postprocess.py" "$OUT" "$2" >/dev/null \
        || die "could not re-run split-postprocess.py; vendor/ may be workspace-shaped again"
      log "refreshed $n vendored package(s) in $2 from $SRC"
      ( cd "$repo" && git add -A && git -c user.name="vendor-refresh" -c user.email="x@y" \
          commit -q -m "chore: refresh vendored packages from the monorepo" || true )
      ;;
    *) die "unknown command '$cmd' — use: plan | build <name> | all | push | vendor-refresh <name>" ;;
  esac
}

main "$@"
