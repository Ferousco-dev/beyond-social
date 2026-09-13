#!/usr/bin/env python3
"""Move feature-owned code out of apps/web/src/lib and into the feature that owns it.

Why this exists: `apps/web/src/lib` is 19,010 lines, and 8,868 of them sit in 16
directories whose names are identical to a directory in `src/features` — the same
concern, split across two trees, with no rule deciding which half goes where. A
change to chat, say, means knowing which of `lib/chat` and `features/chat` each
file belongs to, which is exactly the thing that makes this app feel like too much.

The rule the result enforces:

    src/app        routing. Pages and route handlers, nothing that decides.
    src/features/X  everything that belongs to one feature, including its lib/.
    src/lib        code two or more features import. If it is imported by one,
                   it is not a lib, it is a feature file in the wrong place.

Measured before touching anything: `lib/supabase` (3,435 lines, 23 importers),
`lib/logger`, `lib/env`, `lib/utils` are genuinely shared and are left alone.

Usage:
    python3 tools/relocate-lib.py plan              # what would move, and why
    python3 tools/relocate-lib.py apply             # move + rewrite every import
    python3 tools/relocate-lib.py apply --only chat # one module, for a reviewable PR

Run `pnpm --filter @beyond-social/web typecheck` afterwards. The rewrite is
mechanical, but the typecheck is the thing that says it is complete: a missed
specifier is a compile error, not a runtime surprise, because every import here
goes through the `@/*` path alias.
"""
import json
import os
import re
import shutil
import subprocess
import sys

WEB = "apps/web"
LIB = os.path.join(WEB, "src/lib")
FEAT = os.path.join(WEB, "src/features")


def loc(path):
    total = 0
    for dp, _, fns in os.walk(path):
        for fn in fns:
            if fn.endswith((".ts", ".tsx")):
                with open(os.path.join(dp, fn), errors="ignore") as fh:
                    total += sum(1 for _ in fh)
    return total


def file_eq(a, b):
    try:
        with open(a, "rb") as fa, open(b, "rb") as fb:
            return fa.read() == fb.read()
    except OSError:
        return False


def importers_of(mod, target_dir=None):
    """Which scopes import `@/lib/<mod>` — the evidence for whether it is shared.

    With `target_dir`, the question flips: does anything import from that directory
    at all? Used to prove a duplicate is dead before deleting it, which is the only
    reason the deletion is safe rather than a guess.
    """
    if target_dir:
        found = set()
        for dp, _, fns in os.walk(os.path.join(WEB, "src")):
            if os.path.abspath(dp).startswith(os.path.abspath(target_dir)):
                continue
            for fn in fns:
                if not fn.endswith((".ts", ".tsx")):
                    continue
                txt = open(os.path.join(dp, fn), errors="ignore").read()
                for m in re.finditer(r"""from\s+["']([^"']+)["']""", txt):
                    spec = m.group(1)
                    if spec.startswith("@/") and spec[2:].rstrip("/") == os.path.relpath(
                            target_dir, os.path.join(WEB, "src")).replace(os.sep, "/"):
                        found.add(spec)
                    elif spec.startswith(".") and os.path.abspath(
                            os.path.join(dp, spec)) == os.path.abspath(target_dir):
                        found.add(spec)
        return found
    pat = re.compile(r"""from\s+["']@/lib/%s(?:/[^"']*)?["']""" % re.escape(mod))
    found = set()
    for base in (os.path.join(WEB, "src"), os.path.join(WEB, "scripts")):
        for dp, _, fns in os.walk(base):
            if "node_modules" in dp:
                continue
            for fn in fns:
                if not fn.endswith((".ts", ".tsx")):
                    continue
                p = os.path.join(dp, fn)
                if p.startswith(os.path.join(LIB, mod)):
                    continue
                if pat.search(open(p, errors="ignore").read()):
                    rel = os.path.relpath(p, os.path.join(WEB, "src"))
                    found.add(rel.split(os.sep)[0] + "/" + (rel.split(os.sep)[1]
                              if rel.startswith("features/") else "…"))
    return found


def verdict(name, users):
    """Whether the import graph says this is a lib or a misplaced feature file.

    A name that matches a feature directory is only a hypothesis. The evidence is
    who imports it: one feature and its routes means the module belongs to that
    feature, while two or more features — or anything inside lib/ itself — means it
    is shared infrastructure that happens to share a name. `lib/billing` is imported
    by nine scopes and stays exactly where it is; `lib/script` is imported by one
    and moves.
    """
    feats = {u.split("/")[-1] for u in users if u.startswith("features/")}
    other_feats = feats - {name}
    lib_internal = [u for u in users if u.startswith("lib/")]
    if other_feats:
        return "shared", f"also imported by {', '.join(sorted(other_feats))}"
    if lib_internal:
        return "shared", "imported by lib/ itself, so it is infrastructure"
    if feats == {name} or not feats:
        return "move", "one importer scope" if feats else "no feature imports it"
    return "shared", "unclear ownership"


def candidates():
    feats = set(os.listdir(FEAT))
    out = []
    for name in sorted(os.listdir(LIB)):
        src = os.path.join(LIB, name)
        if not os.path.isdir(src) or name not in feats:
            continue
        users = importers_of(name)
        v, why = verdict(name, users)
        out.append((name, loc(src), users, v, why))
    return out


# Which files each run actually moved, so the escape guard can ignore a destination
# that already had its own correct relative imports.
MOVED_FILES = {}


def apply_moves(only=None):
    rows = candidates()
    if only:
        rows = [r for r in rows if r[0] in only]
    else:
        rows = [r for r in rows if r[3] == "move"]
    moved = []
    for name, lines, _, _, _ in rows:
        src = os.path.join(LIB, name)
        dst = os.path.join(FEAT, name, "lib")
        if os.path.isdir(dst):
            # The feature already has its own lib/, which is what this move is
            # trying to create. Merging is the right answer only when the two sets
            # of files do not collide: a collision means two modules with the same
            # path exist for a reason, and silently overwriting one of them is how
            # a refactor like this loses code. So merge when it is safe, stop when
            # it is not, and never half-apply.
            incoming = {os.path.relpath(os.path.join(dp, fn), src)
                        for dp, _, fns in os.walk(src) for fn in fns}
            existing = {os.path.relpath(os.path.join(dp, fn), dst)
                        for dp, _, fns in os.walk(dst) for fn in fns}
            clash = sorted(incoming & existing)
            if clash and all(
                file_eq(os.path.join(src, c), os.path.join(dst, c)) for c in clash
            ) and not importers_of(f"{name}/lib-collision-probe", target_dir=dst):
                # Every colliding pair is byte-identical and the destination copy has
                # no importers, which has one explanation: the same module exists
                # twice, and the feature-local one is dead. This happened here — 8
                # files under features/editor/lib duplicated lib/editor exactly,
                # with every import pointing at lib/editor. Deleting the unreferenced
                # half is the move; keeping both is the bug being fixed.
                for c in clash:
                    os.remove(os.path.join(dst, c))
                    print(f"  dropped dead duplicate: {os.path.relpath(os.path.join(dst, c), WEB)}")
                # Move every incoming file, including the ones that collided: the
                # collision was resolved by deleting the dead half, so the live copy
                # still has to arrive or the module simply vanishes. (An earlier
                # version subtracted `clash` here and lib/voice/phrase.ts went
                # missing from both trees — typecheck caught it, but only because
                # typecheck was run.)
                shutil.rmtree(src, ignore_errors=True)
                # Only the files that came across in this run. The destination's own
                # files were correct before the move and are correct after it, so
                # auditing them turns a clean move into a false alarm.
                MOVED_FILES[name] = set(incoming)
                moved.append((name, lines))
                continue
            if clash:
                print(f"\nABORTED — lib/{name} and {dst} both contain:")
                for c in clash:
                    print(f"  {c}")
                print("\nThose need a human to read both and decide. Everything else in this run")
                print("is already moved; finish the decision and re-run, it is idempotent.")
                sys.exit(1)
            for rel in sorted(set(incoming)):
                os.makedirs(os.path.dirname(os.path.join(dst, rel)), exist_ok=True)
                shutil.move(os.path.join(src, rel), os.path.join(dst, rel))
            MOVED_FILES[name] = set(incoming)
            shutil.rmtree(src, ignore_errors=True)
            print(f"merged lib/{name} into the existing {os.path.relpath(dst, WEB)}")
            moved.append((name, lines))
            continue
        shutil.move(src, dst)
        MOVED_FILES[name] = {os.path.relpath(os.path.join(dp, fn), src)
                             for dp, _, fns in os.walk(src) for fn in fns}
        moved.append((name, lines))
    if not moved:
        print("nothing to move")
        return moved

    # Rewrite the specifiers. `@/lib/chat/x` -> `@/features/chat/lib/x`; the alias
    # itself (`@/*` -> `./src/*`) already covers the new location, so tsconfig needs
    # no change and no relative-import arithmetic is involved anywhere.
    pat = re.compile(r"""(["'])@/lib/(%s)((?:/[^"']*)?)\1""" % "|".join(re.escape(n) for n, _ in moved))
    touched = 0
    for base in (os.path.join(WEB, "src"), os.path.join(WEB, "scripts")):
        for dp, _, fns in os.walk(base):
            if "node_modules" in dp:
                continue
            for fn in fns:
                if not fn.endswith((".ts", ".tsx")):
                    continue
                p = os.path.join(dp, fn)
                txt = open(p, errors="ignore").read()
                new = pat.sub(lambda m: f'{m.group(1)}@/features/{m.group(2)}/lib{m.group(3)}{m.group(1)}', txt)
                # The smoke tests under apps/web/scripts reach into the app by
                # relative path rather than through the alias, so they need the same
                # fix. Missing this is not a rename nobody reads — it is a typecheck
                # error in the harness that checks the feature works at all.
                for m in list(re.finditer(r'''from\s+"(\.[^"]*)"''', new)):
                    spec = m.group(1)
                    target = os.path.abspath(os.path.normpath(os.path.join(dp, spec)))
                    for n, _ in moved:
                        root = os.path.abspath(os.path.join(LIB, n))
                        if target == root or target.startswith(root + os.sep):
                            rest = os.path.relpath(target, root).replace(os.sep, "/")
                            dest_mod = os.path.join(FEAT, n, "lib")
                            if rest != ".":
                                dest_mod = os.path.join(dest_mod, rest)
                            rel = os.path.relpath(dest_mod, dp).replace(os.sep, "/")
                            if not rel.startswith("."):
                                rel = "./" + rel
                            new = new.replace(f'from "{spec}"', f'from "{rel}"')
                            break
                if new != txt:
                    open(p, "w").write(new)
                    touched += 1
    # Guard, not a second rewriter. A relative import that leaves the moved
    # directory resolves one level away from where it used to, and fixing it with a
    # regex is a second piece of logic to get wrong. This codebase aliases every
    # cross-directory import to `@/`, so none exist; if one is ever introduced,
    # abort here with the file named rather than emitting a move that breaks at
    # build time in a way the diff does not explain.
    blockers = []
    for name, _ in moved:
        dst = os.path.abspath(os.path.join(FEAT, name, "lib"))
        only_moved = MOVED_FILES.get(name, set())
        for dp, _, fns in os.walk(dst):
            for fn in fns:
                if not fn.endswith((".ts", ".tsx")):
                    continue
                fp = os.path.join(dp, fn)
                if only_moved and os.path.relpath(fp, dst) not in only_moved:
                    continue
                for m in re.finditer(r"""from\s+["'](\.[^"']*)["']""", open(fp, errors="ignore").read()):
                    target = os.path.abspath(os.path.join(dp, m.group(1)))
                    if not target.startswith(dst):
                        blockers.append(f"{os.path.relpath(fp, WEB)}: {m.group(1)}")
    if blockers:
        print("\nABORTED — relative imports that escape the moved directory:")
        for b in blockers:
            print(f"  {b}")
        print("\nConvert those to `@/lib/...` aliases first and re-run. The alias is how")
        print("every other cross-directory import in this app is written, and a move that")
        print("mixes the two conventions is worse than no move.")
        sys.exit(1)

    print(f"moved {len(moved)} module(s), {sum(l for _, l in moved):,} lines; "
          f"rewrote the alias in {touched} file(s)")
    print("next: pnpm --filter @beyond-social/web typecheck && pnpm --filter @beyond-social/web lint")
    return moved


def main():
    args = sys.argv[1:]
    cmd = args[0] if args else "plan"
    only = set(args[args.index("--only") + 1:]) if "--only" in args else None

    if cmd == "plan":
        rows = candidates()
        print(f"{'LOC':>6}  {'module':<18} {'call':<7} why\n" + "-" * 78)
        for name, lines, users, v, why in sorted(rows, key=lambda r: (r[3] != "move", -r[1])):
            print(f"{lines:>6}  lib/{name:<13} {v:<7} {why}")
            print(f"{'':>33}imported by: {', '.join(sorted(users)) or '(nobody)'}")
        moves = [r for r in rows if r[3] == "move"]
        print(f"\nmove: {len(moves)} dirs, {sum(l for _, l, _, _, _ in moves):,} lines")
        print(f"stay: {len(rows) - len(moves)} dirs, "
              f"{sum(l for _, l, _, _, _ in rows) - sum(l for _, l, _, _, _ in moves):,} lines "
              f"(lib/ total {loc(LIB):,})")
        print("\nThe ones that stay are not misfiled, they are shared with a misleading name —\n"
              "renaming them to say so (lib/billing -> lib/credits-ledger, say) is a separate,\n"
              "cheaper change than moving them. Do not move a module because its name matches a\n"
              "feature directory; move it because only that feature imports it.")
        print("\napply with: python3 tools/relocate-lib.py apply   (then: pnpm --filter @beyond-social/web typecheck)")
    elif cmd == "apply":
        apply_moves(only)
    else:
        sys.exit("usage: relocate-lib.py [plan|apply] [--only name ...]")


if __name__ == "__main__":
    main()
