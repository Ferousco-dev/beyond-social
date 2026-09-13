#!/usr/bin/env python3
"""Turn each filtered repo from tools/split-repos.sh into something that can go green.

The filter step gives a repo its files and its history. It cannot give it the
four things that only made sense at the monorepo root:

  1. `workspace:*` deps on @beyond-social/*, which resolve to nothing outside a
     workspace. Resolved per package size: the two substantial packages are
     published, the three tiny ones are vendored (see docs/repo-split-plan.md).
  2. next.config.ts's outputFileTracingRoot, hardcoded two directories up.
  3. CI workflows that call `turbo run` and `pnpm --filter` against a workspace
     that no longer exists in the repo.
  4. README/AGENTS that describe the old layout.

Idempotent: re-running it on an already-processed repo is a no-op.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import sys

# Internal packages, and how each crosses the repo boundary.
#   publish: gets a tsup build, dist/ output, and a tag-triggered release;
#            consumers depend on a version range and resolve it from an .npmrc.
#   vendor:  copied wholesale into the consumer's vendor/ dir as a workspace
#            member, so the import specifier never changes and no registry is
#            involved. Right for packages this small, wrong for anything with
#            behaviour worth testing against its callers.
PACKAGES = {
    "@beyond-social/ai-gateway": "publish",
    "@beyond-social/prompt-engine": "publish",
    "@beyond-social/env": "vendor",
    "@beyond-social/rate-limit": "vendor",
    "@beyond-social/sdk": "publish-standalone",
    "@beyond-social/eslint-config": "config",
    "@beyond-social/typescript-config": "config",
}

# `config` packages are dev-only (eslint and tsconfig), which makes them the least
# publishable things in the tree: they would need a release cycle to change a lint
# rule. Vendored everywhere, updated by hand, never versioned.

SRC = os.environ.get("REPO_ROOT") or os.getcwd()


def note(msg: str) -> None:
    print(f"      {msg}")


def read_json(path):
    with open(path) as fh:
        return json.load(fh)


def write_json(path, data):
    with open(path, "w") as fh:
        json.dump(data, fh, indent=2)
        fh.write("\n")


def write_text(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        fh.write(text)


# --------------------------------------------------------------------------
# 1. Cross-repo dependency wiring
# --------------------------------------------------------------------------

def pkg_dir_for(name: str) -> str:
    return os.path.join(SRC, "packages", name.split("/", 1)[1])


def vendor_package(dest: str, name: str):
    """Copy a package into <dest>/vendor/<short-name> as a workspace member.

    Returns the destination, or None if the source was not there to copy.
    """
    short = name.split("/", 1)[1]
    target = os.path.join(dest, "vendor", short)
    if os.path.isdir(target):
        note(f"vendor/{short} already present, leaving it")
        return target
    src = pkg_dir_for(name)
    if not os.path.isdir(src):
        note(f"!! {src} missing, cannot vendor {name}")
        return None
    shutil.copytree(
        src, target,
        ignore=shutil.ignore_patterns("node_modules", ".turbo", "dist", "tsconfig.tsbuildinfo"),
    )
    pj = os.path.join(target, "package.json")
    d = read_json(pj)
    # Its own devDeps pointed at the shared lint/TS config with `workspace:*`, which
    # resolves to nothing in a repo that does not contain them. A vendored copy is
    # consumed here, not developed here; the source of truth lints it in `shared`.
    d["devDependencies"] = {}
    d["scripts"] = {k: v for k, v in d.get("scripts", {}).items()
                    if k not in ("lint", "typecheck", "test")}
    write_json(pj, d)
    for drop in ("eslint.config.mjs", "tsconfig.json"):
        if os.path.isfile(os.path.join(target, drop)) and drop == "eslint.config.mjs":
            os.remove(os.path.join(target, drop))
    # Provenance, because a vendored copy with no origin is a fork by accident.
    write_text(os.path.join(target, "VENDORED.md"), f"""# Vendored from the monorepo

Copied from `packages/{short}` at the moment of the split. This copy is the
source of truth for **this repo only** — the package is 26–240 lines with 1–3
commits touching it ever, which does not earn it a publish pipeline.

If you change behaviour here, change `packages/{short}` in the monorepo too, or
say deliberately that this repo now owns its own copy. Silence is what turns a
vendor directory into three divergent implementations.

Regenerate from a monorepo checkout with:

    bash tools/split-repos.sh vendor-refresh {os.path.basename(dest)}
""")
    note(f"vendored {name} -> vendor/{short}")
    return target


def ensure_workspace_members(dest: str, patterns: list[str]) -> None:
    """List vendor/* in pnpm-workspace.yaml, or `workspace:*` has nothing to resolve to."""
    ws = os.path.join(dest, "pnpm-workspace.yaml")
    txt = open(ws).read() if os.path.isfile(ws) else "packages:\n"
    lines = [l for l in txt.splitlines() if not l.startswith("#")]
    have = set(re.findall(r'^\s+-\s+"([^"]+)"', "\n".join(lines), re.M))
    add = [p for p in patterns if p not in have]
    if not add:
        return
    if not any(l.strip() == "packages:" for l in lines):
        lines.insert(0, "packages:")
    out, done = [], False
    for l in lines:
        out.append(l)
        if not done and l.strip() == "packages:":
            out.extend(f'  - "{p}"' for p in add)
            done = True
    write_text(ws, "\n".join(out) + "\n")
    note(f"workspace: added {', '.join(add)}")


def workspace_members(dest: str) -> set[str]:
    """Every package name this repo can resolve `workspace:*` against."""
    names = set()
    for cand in (dest, os.path.join(dest, "packages"), os.path.join(dest, "vendor")):
        pj = os.path.join(cand, "package.json")
        if os.path.isfile(pj):
            names.add(read_json(pj).get("name", ""))
        if os.path.isdir(cand):
            for sub in os.listdir(cand):
                sub_pj = os.path.join(cand, sub, "package.json")
                if os.path.isfile(sub_pj):
                    names.add(read_json(sub_pj).get("name", ""))
    names.discard("")
    return names


def repo_jsons(dest: str):
    for cand in (os.path.join(dest, "package.json"),):
        if os.path.isfile(cand):
            yield cand
    for group in ("packages", "vendor", "apps", "services"):
        base = os.path.join(dest, group)
        if not os.path.isdir(base):
            continue
        for sub in sorted(os.listdir(base)):
            pj = os.path.join(base, sub, "package.json")
            if os.path.isfile(pj):
                yield pj


def resolve_internal_deps(dest: str) -> bool:
    """Rewrite every `@beyond-social/*` specifier for a world without one workspace.

    Three outcomes per dependency, and only three:

      member   it lives in this repo (or was just vendored) -> `workspace:*`
      vendor   tiny, dev-only, or single-consumer -> copied to vendor/, so the
               import specifier never changes and no registry is involved
      publish  real behaviour with real tests -> a `^1.0.0` range against
               GitHub Packages, which is the only thing that needs a token

    Returns whether the repo still needs the private registry at install time.
    """
    vendored_here: set[str] = set()
    needs_registry = False

    # Pass 1: decide and copy, so pass 2 can see the new members.
    for pj in list(repo_jsons(dest)):
        d = read_json(pj)
        members = workspace_members(dest) | vendored_here
        for field in ("dependencies", "devDependencies", "peerDependencies"):
            for name in list(d.get(field, {})):
                if not name.startswith("@beyond-social/"):
                    continue
                kind = PACKAGES.get(name, "publish")
                if name in members:
                    d[field][name] = "workspace:*"
                elif kind in ("vendor", "config"):
                    target = vendor_package(dest, name)
                    if target:
                        vendored_here.add(name)
                        d[field][name] = "workspace:*"
                else:
                    d[field][name] = "^1.0.0"
                    if field != "devDependencies":
                        needs_registry = True
        write_json(pj, d)

    if vendored_here:
        ensure_workspace_members(dest, ["vendor/*"])

    if needs_registry:
        npmrc = os.path.join(dest, ".npmrc")
        existing = open(npmrc).read() if os.path.isfile(npmrc) else ""
        if "@beyond-social:registry" not in existing:
            with open(npmrc, "a") as fh:
                fh.write("\n# Published @beyond-social/* packages. Reading a private package from GitHub\n"
                         "# Packages needs a token even for `pnpm install`, so CI and Vercel both need\n"
                         "# NPM_READONLY_TOKEN (a PAT with read:packages) written into ~/.npmrc.\n"
                         "@beyond-social:registry=https://npm.pkg.github.com\n")
            note("added @beyond-social registry to .npmrc (this repo needs a read token)")
    else:
        note("installs with no registry token: every internal dep is a member or vendored")

    # Vendored copies ship src/*.ts exactly as they did in the workspace, so the
    # bundler has to be told to compile them. Published ones ship dist + .d.ts and
    # need no such instruction, which is the point of publishing them.
    # Only the packages whose *source* is imported at runtime. eslint-config and
    # typescript-config are also vendored, but they are never bundled, and naming
    # them here makes the next reader wonder what Next has to do with a tsconfig.
    runtime_vendored = {n for n in vendored_here if PACKAGES.get(n) != "config"}
    if runtime_vendored:
        merge_transpile(dest, runtime_vendored)
    return needs_registry


def merge_transpile(dest: str, vendored: set[str]) -> None:
    """Ensure every vendored package is named in transpilePackages.

    `apps/web` already had a transpilePackages array and `apps/admin` had none, so
    both cases have to work. Skipping the existing-array case is the dangerous one:
    the vendored package resolves, the import is satisfied, and then webpack refuses
    to parse the TypeScript in node_modules — an error that names the bundler and
    not the dependency, and that no amount of reading package.json explains.
    """
    nc = os.path.join(dest, "next.config.ts")
    if not os.path.isfile(nc):
        return
    txt = open(nc).read()
    m = re.search(r"(transpilePackages:\s*\[)([^\]]*)(\])", txt, re.S)
    if m:
        listed = set(re.findall(r"""['"]([^'"]+)['"]""", m.group(2)))
        missing = sorted(vendored - listed)
        if not missing:
            note("transpilePackages already covers every vendored package")
            return
        txt = txt[:m.end(2)] + "".join(f'\n    "{n}",' for n in missing) + txt[m.end(2):]
        open(nc, "w").write(txt)
        note("transpilePackages += " + ", ".join(missing))
        return
    block = ("  // Vendored packages ship raw TypeScript, exactly as they did through\n"
             "  // the workspace symlink; Next compiles nothing under node_modules\n"
             "  // unless it is named here.\n"
             "  transpilePackages: [\n"
             + "".join(f'    "{n}",\n' for n in sorted(vendored)) + "  ],\n")
    for anchor_key in ("  outputFileTracingRoot", "  async headers()", "const nextConfig: NextConfig = {\n"):
        if anchor_key in txt:
            txt = txt.replace(anchor_key, block + anchor_key, 1)
            open(nc, "w").write(txt)
            note("transpilePackages added: " + ", ".join(sorted(vendored)))
            return
    note("!! could not find an anchor in next.config.ts; add transpilePackages by hand")


# --------------------------------------------------------------------------
# 2. Fixes for assumptions the split invalidates
# --------------------------------------------------------------------------

def fix_tracing_root(dest: str) -> None:
    """outputFileTracingRoot walked two directories up to reach the lockfile.

    In a standalone repo the lockfile is in the repo root, which *is* the app
    directory, so the old arithmetic points one level above the checkout. Next
    does not error on this: it traces the wrong root and you get missing files
    at runtime on Vercel.
    """
    for rel in ("next.config.ts",):
        p = os.path.join(dest, rel)
        if not os.path.isfile(p):
            continue
        txt = open(p).read()
        if "outputFileTracingRoot: monorepoRoot" not in txt:
            continue
        txt = txt.replace(
            'const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");',
            "// In the monorepo this walked up to the workspace root, which is where the\n"
            "// lockfile lived and what outputFileTracingRoot had to name. In this repo the\n"
            "// lockfile is here, so the root is this directory; naming anything else makes\n"
            "// Next trace a directory outside the checkout and drop files from the bundle.\n"
            'const repoRoot = path.dirname(fileURLToPath(import.meta.url));')
        txt = txt.replace("outputFileTracingRoot: monorepoRoot,", "outputFileTracingRoot: repoRoot,")
        # Only drop `node:path` if nothing in the file still calls it. The first
        # version of this trimmed the import on the strength of `path.join` being
        # gone, and `path.dirname` two lines below still needed it: typecheck
        # caught it, but nothing at build time would have.
        if not re.search(r"\bpath\.", txt):
            txt = txt.replace('import path from "node:path";\n', "")
        open(p, "w").write(txt)
        note(f"{rel}: outputFileTracingRoot -> repo root")


def fix_prompt_paths(dest: str) -> None:
    """`../../prompts` was two levels up in the workspace; prompts is its own repo now."""
    for dp, fns, _ in []:
        pass
    for root in ("scripts", "src"):
        base = os.path.join(dest, root)
        if not os.path.isdir(base):
            continue
        for dp, _, fns in os.walk(base):
            for fn in fns:
                if not fn.endswith((".ts", ".tsx")):
                    continue
                p = os.path.join(dp, fn)
                txt = open(p).read()
                if "../../prompts" not in txt:
                    continue
                txt = txt.replace('"../../prompts', 'process.env.PROMPTS_DIR ?? "../prompts')
                txt = re.sub(r'join\(process\.cwd\(\), "\.\./\.\./prompts([^"]*)"\)',
                             r'join(process.env.PROMPTS_DIR ?? "../prompts\1")', txt)
                open(p, "w").write(txt)
                note(f"{os.path.relpath(p, dest)}: ../../prompts -> PROMPTS_DIR (default ../prompts)")


def fix_validate_script(dest: str) -> None:
    """Point the engine at the library only when the library is not in this repo.

    `prompts` carries both, so `../../prompts` from packages/prompt-engine is still
    exactly right there and must not be touched. `shared` got the engine without the
    library only in the 5-repo layout, and needs an override to find it.
    """
    pj = os.path.join(dest, "packages", "prompt-engine", "package.json")
    if not os.path.isfile(pj):
        pj = os.path.join(dest, "prompt-engine", "package.json")
    if not os.path.isfile(pj):
        return
    if os.path.isdir(os.path.join(os.path.dirname(os.path.dirname(pj)), "..", "prompts")):
        note("prompt-engine: ../../prompts still resolves in this repo, left alone")
        return
    d = read_json(pj)
    s = d.get("scripts", {})
    for key in ("validate", "ingest"):
        if key in s and "../../prompts" in s[key]:
            s[key] = s[key].replace("../../prompts", "${PROMPTS_DIR:-../prompts}")
    write_json(pj, d)
    note("prompt-engine validate/ingest take PROMPTS_DIR (library is in another repo)")


# --------------------------------------------------------------------------
# 3. Making published packages actually publishable
# --------------------------------------------------------------------------

def make_publishable(dest: str) -> None:
    """Every published package needs a real build, or the tarball is raw .ts.

    This is the whole cost of "versioned packages": a tsup config, a build step,
    dist/ in files, exports pointing at the built output, and a prepublish guard.
    """
    targets = []
    for pkg in ("ai-gateway", "prompt-engine", "sdk"):
        for cand in (os.path.join(dest, "packages", pkg, "package.json"),
                     os.path.join(dest, pkg, "package.json"),
                     os.path.join(dest, "package.json")):
            if os.path.isfile(cand) and read_json(cand).get("name", "").endswith(pkg):
                targets.append((pkg, cand))
                break
    for pkg, pj in targets:
        d = read_json(pj)
        pd = os.path.dirname(pj)
        if "build" in d.get("scripts", {}):
            note(f"{pkg}: build script already present, skipping")
            continue

        d.setdefault("scripts", {})
        d["scripts"]["build"] = "tsup"
        d["scripts"]["dev"] = "tsup --watch"
        d["scripts"]["prepublishOnly"] = "npm run lint && npm run typecheck && npm run build"
        # `files` is what actually lands in the tarball. Listing a README that does
        # not exist is not fatal but it is silently wrong, and a package with no
        # README on the registry page is how a shared package ends up undocumented.
        pd_ = os.path.dirname(pj)
        d["files"] = ["dist"] + (["README.md"] if os.path.isfile(os.path.join(pd_, "README.md")) else [])
        d["main"] = "./dist/index.js"
        d["types"] = "./dist/index.d.ts"
        sub = [k for k in d.get("exports", {}) if k != "."]
        exports = {".": {"types": "./dist/index.d.ts", "import": "./dist/index.js",
                         "default": "./dist/index.js"}}
        for s in sub:
            name = s.lstrip("./")
            exports[s] = {"types": f"./dist/{name}.d.ts", "import": f"./dist/{name}.js",
                          "default": f"./dist/{name}.js"}
        d["exports"] = exports
        d["publishConfig"] = {
            "access": "restricted",
            "registry": "https://npm.pkg.github.com",
            "provenance": False,
        }
        dd = d.setdefault("devDependencies", {})
        dd.setdefault("tsup", "^8.3.5")
        write_json(pj, d)

        entries = ["src/index.ts"] + [f"src/{s.lstrip('./')}.ts" for s in sub]
        write_text(os.path.join(pd, "tsup.config.ts"), f"""/**
 * Generated by tools/split-postprocess.py for the repo split.
 *
 * Before the split this package published nothing: `exports` pointed at
 * `./src/index.ts` and it worked because pnpm symlinked the source into
 * node_modules and apps/web listed it in transpilePackages. Across a repo
 * boundary there is no symlink and no shared bundler config, so a real build
 * with real types is the price of a versioned package.
 */
import {{ defineConfig }} from "tsup";

export default defineConfig({{
  entry: [{", ".join(f'"{e}"' for e in entries)}],
  format: ["esm"],
  // The monorepo typechecked the source; consumers must get declarations or
  // they lose every type the package was exporting from src/.
  //
  // `incremental: false` is load-bearing, not cosmetic: the shared tsconfig sets
  // `incremental`, and tsup's declaration pass runs tsc with the same flags while
  // emitting to a bundle, which fails with TS5074 before it writes any .d.ts.
  dts: {{ compilerOptions: {{ declaration: true, incremental: false }} }},
  sourcemap: true,
  clean: true,
  treeshake: true,
  // These are peer-shaped by nature: one Supabase/zod instance per app, not
  // one per package copy. Bundling them would duplicate state.
  external: ["zod", "@supabase/supabase-js", "@supabase/ssr", "ioredis"],
}});
""")
        note(f"{pkg}: tsup build + dist exports + publishConfig added")


def pin_configs(dest: str) -> None:
    """eslint-config / typescript-config need versions before a range can point at them."""
    for pkg in ("eslint-config", "typescript-config"):
        for cand in (os.path.join(dest, "packages", pkg), os.path.join(dest, pkg)):
            pj = os.path.join(cand, "package.json")
            if not os.path.isfile(pj):
                continue
            d = read_json(pj)
            if d.get("publishConfig"):
                continue
            d["version"] = "1.0.0"
            d["files"] = sorted(f for f in os.listdir(cand)
                                 if f.endswith((".json", ".mjs", ".js")) and f != "package.json")
            d["publishConfig"] = {"access": "restricted", "registry": "https://npm.pkg.github.com"}
            write_json(pj, d)
            note(f"{pkg}: versioned at 1.0.0 with an explicit files list")


# --------------------------------------------------------------------------
# 4. CI
# --------------------------------------------------------------------------

PNPM_SETUP = """      - name: Checkout
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      # GitHub Packages needs a token even to *read* a private package, and the
      # repo's own GITHUB_TOKEN is not automatically granted that for a package
      # published under the org. Create a PAT with read:packages, store it as
      # NPM_READONLY_TOKEN, and this resolves. Until then the install fails with
      # a 401 that names no package, which is how it has confused people before.
      - name: Authenticate the private scope
        if: env.HAS_NPM_TOKEN != ''
        env:
          HAS_NPM_TOKEN: ${{ secrets.NPM_READONLY_TOKEN }}
        run: echo "//npm.pkg.github.com/:_authToken=${NPM_READONLY_TOKEN}" >> "$HOME/.npmrc"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile
"""


def ci_yml(repo: str, *, extra_steps: str = "", deploy: str = "", triggers: str = "") -> str:
    return f"""name: CI

# Adapted from the monorepo's .github/workflows/ci.yml by tools/split-postprocess.py.
# The `turbo run` and `pnpm --filter` invocations are gone: this repo has no
# workspace to schedule across, so each step names its own command.
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]{triggers}
  # Lets a deploy be re-run without an empty commit, which matters when a
  # deployment failed for a reason outside the code, such as a rotated token.
  workflow_dispatch:

concurrency:
  group: ${{{{ github.workflow }}}}-${{{{ github.ref }}}}
  cancel-in-progress: true

jobs:
  verify:
    name: Verify
    runs-on: ubuntu-latest
    steps:
{PNPM_SETUP}{extra_steps}
{deploy}"""


def deploy_steps(project: str, health_paths: str = "/ /api/health") -> str:
    return f"""
  deploy-preview:
    name: Deploy preview
    needs: verify
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    environment:
      name: preview
      url: ${{{{ steps.deploy.outputs.url }}}}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      # Checked in a step rather than a job-level `if`, because secrets are not
      # available there. Keeps the workflow green before Vercel credentials are
      # configured instead of failing every run until they are.
      - name: Check for Vercel credentials
        id: creds
        env:
          VERCEL_TOKEN: ${{{{ secrets.VERCEL_TOKEN }}}}
        run: |
          if [ -z "$VERCEL_TOKEN" ]; then
            echo "configured=false" >> "$GITHUB_OUTPUT"
            echo "::notice::VERCEL_TOKEN is not set, so no preview was deployed."
          else
            echo "configured=true" >> "$GITHUB_OUTPUT"
          fi

      - name: Deploy
        id: deploy
        if: steps.creds.outputs.configured == 'true'
        env:
          VERCEL_TOKEN: ${{{{ secrets.VERCEL_TOKEN }}}}
          VERCEL_ORG_ID: ${{{{ secrets.VERCEL_ORG_ID }}}}
          VERCEL_PROJECT_ID: ${{{{ secrets.VERCEL_PROJECT_ID }}}}
        run: |
          # --archive=tgz because the working tree is large enough that a plain
          # upload has failed on this project before.
          url=$(npx --yes vercel@latest deploy --yes --archive=tgz --token "$VERCEL_TOKEN")
          echo "url=$url" >> "$GITHUB_OUTPUT"
          echo "Preview: $url" >> "$GITHUB_STEP_SUMMARY"

  deploy-production:
    name: Deploy production
    needs: verify
    # Vercel's own git integration is switched off in vercel.json, so this job
    # is the only path to production. While the integration was live it deployed
    # straight from the push without looking at whether tests passed.
    if: >-
      github.ref == 'refs/heads/main' &&
      (github.event_name == 'push' || github.event_name == 'workflow_dispatch')
    runs-on: ubuntu-latest
    concurrency:
      group: deploy-production
      cancel-in-progress: false
    environment:
      name: production
      url: ${{{{ steps.deploy.outputs.url }}}}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Check for Vercel credentials
        id: creds
        env:
          VERCEL_TOKEN: ${{{{ secrets.VERCEL_TOKEN }}}}
        run: |
          if [ -z "$VERCEL_TOKEN" ]; then
            echo "configured=false" >> "$GITHUB_OUTPUT"
            echo "::warning::VERCEL_TOKEN is not set, so main was not deployed."
          else
            echo "configured=true" >> "$GITHUB_OUTPUT"
          fi

      - name: Deploy
        id: deploy
        if: steps.creds.outputs.configured == 'true'
        env:
          VERCEL_TOKEN: ${{{{ secrets.VERCEL_TOKEN }}}}
          VERCEL_ORG_ID: ${{{{ secrets.VERCEL_ORG_ID }}}}
          VERCEL_PROJECT_ID: ${{{{ secrets.VERCEL_PROJECT_ID }}}}
        run: |
          url=$(npx --yes vercel@latest deploy --prod --yes --archive=tgz --token "$VERCEL_TOKEN")
          echo "url=$url" >> "$GITHUB_OUTPUT"
          echo "Production: $url" >> "$GITHUB_STEP_SUMMARY"

      - name: Smoke check production
        if: steps.creds.outputs.configured == 'true'
        env:
          # The public alias, not the deployment URL the CLI prints. Deployment
          # URLs sit behind Vercel's deployment protection and answer 302 to an
          # SSO redirect, so checking one fails on a healthy deploy.
          PRODUCTION_URL: https://{project}
        run: |
          for path in {health_paths}; do
            code=$(curl -s -o /dev/null -w '%{{http_code}}' --max-time 45 "$PRODUCTION_URL$path")
            if [ "$code" -ge 500 ]; then
              echo "::error::$path returned $code after the deploy"
              exit 1
            fi
            echo "$path -> $code"
          done
"""


PUBLISH_YML = """name: Publish

# Tag-triggered, because a package that publishes on every merge to main has no
# version that means anything: `^1.0.0` would silently move underneath a deployed
# app whenever a maintainer pushed a README fix. `git tag ai-gateway@1.1.0` is the
# decision that a release exists, and the tag is what a repo can roll back to.
on:
  push:
    tags: ["*@*.*.*"]

permissions:
  contents: read
  packages: write

jobs:
  publish:
    name: Publish
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          # Wires ~/.npmrc to GitHub Packages for publishing. The token here is
          # the built-in one, which CAN write packages in this repo's org; the
          # read-only PAT is only needed by consumers.
          registry-url: https://npm.pkg.github.com

      - run: pnpm install --frozen-lockfile

      # The tag carries the package and the version, so a tag for the wrong
      # package or a version that already exists fails here rather than
      # publishing something nobody asked for.
      - name: Check the tag names a real package and version
        id: tag
        run: |
          ref="${GITHUB_REF_NAME}"
          pkg="${ref%@*}"; ver="${ref##*@}"
          dir="packages/${pkg}"
          [ -d "$dir" ] || { echo "::error::$dir does not exist"; exit 1; }
          actual=$(node -p "require('./$dir/package.json').version")
          [ "$actual" = "$ver" ] || { echo "::error::tag says $ver, package.json says $actual"; exit 1; }
          echo "dir=$dir" >> "$GITHUB_OUTPUT"

      - run: pnpm --filter "./*" run build
      - run: pnpm --filter "./${{ steps.tag.outputs.dir }}" publish --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
"""


SECURITY_YML = """name: Security

# Copied from the monorepo. Two things the pipeline never checked: whether a
# secret has been committed, and whether dependencies have known advisories.
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  # Advisories are published against code that has not changed, so this cannot
  # only run on a push. Monday morning, before the week's work starts.
  schedule:
    - cron: "0 7 * * 1"
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  secrets:
    name: Secret scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        # Full history: a secret committed and then removed is still in the
        # history and still needs rotating, and a shallow clone hides it.
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install gitleaks
        run: |
          version=8.21.2
          curl -sSfL "https://github.com/gitleaks/gitleaks/releases/download/v${version}/gitleaks_${version}_linux_x64.tar.gz" \\
            | tar -xz -C /usr/local/bin gitleaks
          gitleaks version

      - name: Scan history for secrets
        run: gitleaks detect --redact --no-banner --config .gitleaks.toml --exit-code 1

      - name: Assert no env files are tracked
        run: |
          # `.env.example` files are checked in on purpose: they are the
          # template, and they carry names without values.
          tracked=$(git ls-files | grep -E '(^|/)\\.env(\\.|$)' | grep -v '\\.example$' || true)
          if [ -n "$tracked" ]; then
            echo "::error::env files are tracked in git:"
            echo "$tracked"
            exit 1
          fi
          echo "no tracked env files"

  dependencies:
    name: Dependency audit
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Install pnpm
        uses: pnpm/action-setup@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - name: Install dependencies
        run: pnpm install --frozen-lockfile --ignore-scripts
      # Reported at every level so the summary is useful, but only critical
      # advisories fail the run, or a transitive dev advisory trains people to
      # ignore the check.
      - name: Report advisories
        continue-on-error: true
        run: pnpm audit --audit-level low
      - name: Fail on critical advisories
        run: pnpm audit --audit-level critical
"""


def step(name: str, run: str) -> str:
    return f"""
      - name: {name}
        run: {run}"""


VERIFY_CORE = (step("Format check", "pnpm run format:check")
               + step("Lint", "pnpm run lint")
               + step("Typecheck", "pnpm run typecheck")
               + step("Build", "pnpm run build"))


def smoke_steps(prefix: str = "pnpm") -> str:
    """apps/web's smoke tests, minus the pnpm --filter indirection."""
    names = ["generation", "optimization", "trends", "social", "analytics", "trace"]
    return "".join(step(f"{n} tests", f"{prefix} run test:{n}") for n in names)


# --------------------------------------------------------------------------
# 5. README / AGENTS
# --------------------------------------------------------------------------

def readme(repo: str, title: str, blurb: str, bullets: list[str], env: list[str],
           local: list[str], cross: list[str]) -> str:
    e = "\n".join(f"    {x}" for x in env) or "    (none)"
    l = "\n".join(f"    {x}" for x in local)
    c = "\n".join(f"    - {x}" for x in cross) or "    - nothing yet"
    b = "\n".join(f"    - {x}" for x in bullets)
    return f"""# {title}

{blurb}

Split out of `Ferousco-dev/beyond-social` on {os.environ.get("SPLIT_DATE", "the split date")}; the
commit history predates that and was rewritten to these paths, so `git log` and
`git blame` still work on every file here.

## What lives here

{b}

## Setup

{l}

## Cross-repo dependencies

{c}

## Environment

Every variable this repo reads is listed in `.env.example`:

{e}

Copy it to `.env.local` and fill it in. Nothing in here has a working default for
production credentials: with no Supabase configured the app runs on placeholders
rather than half-working, which is deliberate.
"""


AGENTS_BANNER = """<!-- GENERATED by tools/split-postprocess.py.

     This repo used to be a directory inside a pnpm workspace. What that changes
     for anyone working here:

       - `@beyond-social/*` deps are NOT workspace symlinks any more. Published
         ones come from the registry, vendored ones live in vendor/.
       - There is no `turbo`, no `--filter`, and no repository-wide build. Run
         the scripts in this repo's package.json.
       - Code that lives in another repo cannot be edited from here. When a
         change spans repos, land the dependency first, publish, then update the
         range here — or accept the PR in both at once and merge in order.
       - The 222 issues and pull requests in the old monorepo are the record of
         WHY this code is shaped like it is. They are at
         github.com/Ferousco-dev/beyond-social and they were not migrated.

     Below this banner: the monorepo's own AGENTS.md, unchanged. Anything in it
     that names apps/ or packages/ refers to paths that do not exist here.
-->

"""


# --------------------------------------------------------------------------
# Repo definitions
# --------------------------------------------------------------------------

def process(repo: str, dest: str) -> None:
    print(f"    -> {repo}")
    globs = []
    ws = os.path.join(dest, "pnpm-workspace.yaml")
    if os.path.isfile(ws):
        globs = re.findall(r'^\s+-\s+"([^"]+)"', open(ws).read(), re.M)

    if repo == "shared":
        resolve_internal_deps(dest)
        make_publishable(dest)
        pin_configs(dest)
        extra = (VERIFY_CORE
                 + step("Behavioural tests", "pnpm --filter @beyond-social/ai-gateway test")
                 + step("Gemini provider tests", "pnpm --filter @beyond-social/ai-gateway test:gemini")
                 + step("Pack the publishable tarball",
                        "pnpm --filter @beyond-social/ai-gateway pack --pack-destination /tmp >/dev/null "
                        "&& tar -tzf /tmp/beyond-social-ai-gateway-*.tgz "
                        "| grep -q 'dist/index.d.ts' "
                        "|| { echo '::error::the published tarball has no type declarations'; exit 1; }"))
        write_text(os.path.join(dest, ".github/workflows/ci.yml"), ci_yml(repo, extra_steps=extra))
        write_text(os.path.join(dest, ".github/workflows/publish.yml"), PUBLISH_YML)
        write_text(os.path.join(dest, ".github/workflows/security.yml"), SECURITY_YML)
        write_text(os.path.join(dest, "README.md"), readme(
            repo, "Shared packages",
            "The packages that used to be resolved by a workspace symlink: the AI provider boundary,\n"
            "the environment schema, the rate limiter, and the lint and TypeScript configs.\n\n"
            "`ai-gateway` is published. The rest are vendored straight into the repos that use them\n"
            "(26 to 224 lines each, 1 to 3 commits ever), which keeps those repos installable with\n"
            "no registry credentials and no release ceremony.",
            ["`packages/ai-gateway` — one interface in front of Gemini, Kie and the other providers."],
            ["GEMINI_API_KEY and the provider keys, for the package's own behavioural tests only."],
            ["    pnpm install", "    pnpm run build        # tsup: src -> dist + dist/index.d.ts",
             "    pnpm run test", "    git tag ai-gateway@1.1.0 && git push --tags   # releases"],
            ["- `website` installs `@beyond-social/ai-gateway` from GitHub Packages, so publishing a",
             "  tag here is the only way a change here becomes visible there. That is the cost.",
             "- `env`, `rate-limit`, `eslint-config` and `typescript-config` are VENDORED into the",
             "  repos that use them. Edits here do not propagate; the copies say so in VENDORED.md.",
             "- `prompt-engine` is not here at all: it is published from `prompts`, which carries the",
             "  knowledge base it validates, so `../../prompts` still resolves inside one repo."]))
        return

    if repo == "sdk":
        resolve_internal_deps(dest)
        make_publishable(dest)
        write_text(os.path.join(dest, ".github/workflows/ci.yml"), ci_yml(
            repo, extra_steps=VERIFY_CORE + step("SDK tests", "pnpm run test")))
        write_text(os.path.join(dest, ".github/workflows/security.yml"), SECURITY_YML)
        write_text(os.path.join(dest, "README.md"), readme(
            repo, "Client SDK",
            "The public client for Beyond Social: generate a video, poll it, list the results.\n"
            "Published to npm, versioned independently of the platform.",
            ["`src/` — the client, the resource shapes, and the error types",
             "`scripts/smoke.ts` — the test, run against a live instance"],
            ["BEYOND_API_KEY, BEYOND_API_URL"],
            ["    pnpm install", "    pnpm run build", "    BEYOND_API_KEY=... pnpm run test"],
            ["- The API it talks to is `website`'s `/api/v1` surface; the two version separately",
             "  and the SDK must stay compatible with whichever deployments are live."]))
        return

    if repo == "website":
        resolve_internal_deps(dest)
        fix_tracing_root(dest)
        fix_prompt_paths(dest)
        extra = (VERIFY_CORE + smoke_steps()
                 + step("Prompt registry tests", "pnpm run test:prompt-registry")
                 + step("Entitlements tests", "pnpm run test:entitlements")
                 + step("Credit webhook tests", "pnpm run test:credit-pack-webhook"))
        write_text(os.path.join(dest, ".github/workflows/ci.yml"),
                   ci_yml(repo, extra_steps=extra,
                          deploy=deploy_steps("beyond-social-rust.vercel.app")))
        write_text(os.path.join(dest, ".github/workflows/security.yml"), SECURITY_YML)
        write_text(os.path.join(dest, "README.md"), readme(
            repo, "Customer website",
            "The product: the dashboard, the chat-driven generation flow, the API routes that back\n"
            "it, and the marketing pages. Deployed to Vercel.",
            ["`src/app` — routing only: 1,102 lines of API routes, the rest pages",
             "`src/features` — 28,484 lines across 26 features; behaviour belongs here",
             "`src/lib` — 19,010 lines, 8,868 of which duplicate a feature name (see BOUNDARIES.md)",
             "`vendor/` — the two tiny packages copied in rather than published, per repo-split plan"],
            ["NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,",
             "SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, REDIS_URL, STRIPE_SECRET_KEY,",
             "CRON_SECRET — `.env.example` lists every one of them."],
            ["    pnpm install", "    pnpm run dev          # http://localhost:3000",
             "    pnpm run typecheck", "    pnpm run test:generation   # one feature's smoke test"],
            ["- `shared` publishes `@beyond-social/ai-gateway`; `prompts` publishes",
             "  `@beyond-social/prompt-engine`. This repo depends on both as `^1.0.0` from GitHub",
             "  Packages, so a platform change lands there, gets a tag, and only then appears here.",
             "- `env` and `rate-limit` are vendored under `vendor/` (26 and 224 lines: not worth a",
             "  release cycle). They are owned by this repo now; sync back deliberately or not at all.",
             "- `supabase` owns the schema. `pnpm run test:catalog` and `test:attachments` need a",
             "  running stack from that repo, so they are not in CI here — see the note in BOUNDARIES.",
             "- `prompts` is read by `test:eval` at `../prompts/evaluations/golden-queries.json`;",
             "  override the location with PROMPTS_DIR."]))
        return

    if repo == "admin":
        resolve_internal_deps(dest)
        fix_tracing_root(dest)
        write_text(os.path.join(dest, "README.md"), readme(
            repo, "Admin console",
            "The internal console. Separate Vercel project, separate auth, and deliberately not\n"
            "deployed from the customer app: its CSP allows nothing but Supabase and it is noindexed\n"
            "on purpose, so a crawled login page is not a map of the surface.",
            ["`src/app` — the sections; `src/lib/auth/throttle.ts` uses the vendored rate limiter",
             "Typed routes are off until the route tree settles (see next.config.ts)"],
            ["NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ADMIN_ALLOWED_EMAILS"],
            ["    pnpm install", "    pnpm run dev          # http://localhost:3001",
             "    pnpm run typecheck"],
            ["- `env` and `rate-limit` are vendored under `vendor/`, so this repo installs with no",
             "  registry credentials.",
             "- The schema is the `supabase` repo's; this console reads it through the same keys."]))
        write_text(os.path.join(dest, ".github/workflows/ci.yml"),
                   ci_yml(repo, extra_steps=VERIFY_CORE, deploy=deploy_steps("admin.example.invalid")))
        write_text(os.path.join(dest, ".github/workflows/security.yml"), SECURITY_YML)
        return

    if repo in ("worker", "render", "mail"):
        resolve_internal_deps(dest)
        blurb = {
            "worker": ("Background publishing. Consumes the BullMQ queue, talks to the platform\n"
                       "APIs, and retries. Deployed to Fly; needs REDIS_URL and nothing else.",
                       ["`src/queues` — the queues this process owns",
                        "`src/processors` — one handler per job, and the retry semantics"],
                       ["REDIS_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, the platform API tokens"],
                       ["    pnpm install", "    docker compose up -d redis   # local queue",
                        "    pnpm run dev", "    pnpm run test           # publishing smoke test"]),
            "render": ("Video rendering. Wraps ffmpeg, so it is the one service that cannot live on\n"
                        "a serverless platform; `ffmpeg-static` makes the install need network access\n"
                        "at install time, which is why this is a container and not a Vercel function.",
                        ["`src/` — the render queue consumer and the ffmpeg pipeline"],
                        ["REDIS_URL, PUBLIC_BUCKET_URL, FFMPEG_PATH (optional override)"],
                        ["    pnpm install", "    pnpm run dev", "    fly deploy"]),
            "mail": ("Transactional email. Templates and the provider call, kept out of the app so\n"
                      "a provider outage is not also a request-path outage.",
                      ["`src/templates` — the messages; `src/` — the provider boundary"],
                      ["RESEND_API_KEY (or the SMTP pair), FROM_ADDRESS"],
                      ["    pnpm install", "    pnpm run dev", "    pnpm run build"]),
        }[repo]
        write_text(os.path.join(dest, "README.md"), readme(
            repo, {"worker": "Publishing worker", "render": "Render service",
                   "mail": "Email service"}[repo],
            blurb[0], blurb[1], blurb[2], blurb[3],
            ["- `env` is vendored under `vendor/` and owned by this repo now.",
             "- `supabase` owns the schema; this process reads it with the service role key, which is",
             "  why the deployment secret and the database have to be rotated together."]))
        tests = {"worker": [step("Publishing tests", "pnpm run test"),
                            step("Retry verification", "pnpm run test:retry")],
                 "render": [], "mail": []}[repo]
        write_text(os.path.join(dest, ".github/workflows/ci.yml"),
                   ci_yml(repo, extra_steps=VERIFY_CORE + "".join(tests)))
        write_text(os.path.join(dest, ".github/workflows/security.yml"), SECURITY_YML)
        return

    if repo == "supabase":
        write_text(os.path.join(dest, ".github/workflows/database.yml"), """name: Database

# Carried over from the monorepo's database.yml and de-workspaced: the
# `pnpm --filter web test:catalog` steps tested the web app against this schema
# and now belong in the `website` repo, which needs a running stack for them.
# What remains here is the half that is purely about the database.
on:
  pull_request:
    branches: [main]
    paths: ["migrations/**", "config.toml"]
  push:
    branches: [main]
    paths: ["migrations/**", "config.toml"]
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  migrations:
    name: Migrations replay from empty
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Supabase CLI
        # Pinned. On `latest`, a CLI release changes the schema this job asserts
        # against without a commit touching this repo.
        uses: supabase/setup-cli@v1
        with:
          version: 2.75.0

      - name: Start Supabase
        run: supabase start

      # `db reset` drops the database and replays every migration in order
      # against an empty one, so a migration that only works because of state a
      # developer's machine happens to have fails here.
      - name: Apply every migration from scratch
        run: supabase db reset

      - name: Lint the schema
        run: supabase db lint --level warning

      - name: Stop Supabase
        if: always()
        run: supabase stop --no-backup
""")
        write_text(os.path.join(dest, ".github/workflows/edge-functions.yml"), """name: Edge functions

# Deno files are in no JS workspace, so `tsc` never looked at them. That is not
# academic: `generate-video` was committed calling `uploadImage` after it had
# been renamed to `uploadFile`, would have thrown on every image-to-video
# request, and the pull request went green.
on:
  pull_request:
    branches: [main]
    paths: ["functions/**"]
  push:
    branches: [main]
    paths: ["functions/**"]
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    name: Typecheck and lint
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Deno
        uses: denoland/setup-deno@v2
        with:
          deno-version: v2.x

      - name: Check
        run: deno check functions/**/*.ts && deno lint functions/
""")
        return

    if repo == "prompts":
        resolve_internal_deps(dest)
        make_publishable(dest)
        fix_validate_script(dest)
        write_text(os.path.join(dest, ".github/workflows/ci.yml"), ci_yml(
            repo, extra_steps=(step("Format check", "pnpm --filter @beyond-social/prompt-engine exec "
                                                   "prettier --check \"**/*.ts\"")
                               + VERIFY_CORE
                               + step("Chunk validation against the schema",
                                      "pnpm --filter @beyond-social/prompt-engine validate")
                               + step("Engine tests", "pnpm --filter @beyond-social/prompt-engine test"))))
        write_text(os.path.join(dest, ".github/workflows/security.yml"), SECURITY_YML)
        write_text(os.path.join(dest, "README.md"), readme(
            repo, "Prompt library and prompt engine",
            "The knowledge base the generator retrieves from, and the engine that validates, chunks,\n"
            "embeds and serves it. Published as `@beyond-social/prompt-engine`.\n\n"
            "They live in one repo because the engine's `validate` and `ingest` scripts read the\n"
            "library at `../../prompts`, and because a chunk and the schema it must satisfy drifting\n"
            "apart is the failure mode this whole tree exists to prevent.",
            ["`prompts/` — the library: 1,037 markdown chunks across 24 concerns, plus templates",
             "`packages/prompt-engine/` — chunk schema, retrieval, embeddings, evaluation harnesses",
             "Both are checked in CI: a chunk that does not satisfy the schema fails the pull request."],
            ["OPENAI/GEMINI key and SUPABASE_URL + SERVICE_ROLE_KEY, only for `ingest` and `test:eval`"],
            ["    pnpm install", "    pnpm --filter @beyond-social/prompt-engine validate",
             "    pnpm --filter @beyond-social/prompt-engine test"],
            ["- `website` depends on the published `@beyond-social/prompt-engine`; a behaviour change",
             "  here needs a tag before it is visible there.",
             "- The runtime prompt OVERRIDES live in the Supabase `prompts` table, not here. This",
             "  repo is the floor those overrides are edits against."],
        ))
        return

    print(f"      (no per-repo CI/README template for '{repo}'; left as filtered + scaffolded)")


def main() -> int:
    out = sys.argv[1]
    repos = sys.argv[2:] or sorted(
        d for d in os.listdir(out) if os.path.isdir(os.path.join(out, d, ".git")))
    for repo in repos:
        dest = os.path.join(out, repo)
        process(repo, dest)
        # The AGENTS.md the split script copied needs the generated banner on top.
        ag = os.path.join(dest, "AGENTS.md")
        if os.path.isfile(ag) and "GENERATED by tools/split-postprocess.py" not in open(ag).read():
            if "SPLIT WARNING" in open(ag).read():
                body = open(ag).read().split("-->", 1)[1].lstrip("\n")
                write_text(ag, AGENTS_BANNER + body)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
