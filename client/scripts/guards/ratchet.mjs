// Patterns agents misuse, banned with a ratchet. The counts in baseline.json
// are what existed when the ban started: a file may hold that many or fewer,
// never more, and a new file holds none. Remove some and run
// `pnpm guard:tighten` to lower the baseline; it can never be raised by a tool.

export const BANNED = [
  {
    id: "use-effect",
    why: "useEffect is the hook agents get wrong most (stale deps, double runs, fetch races). Use event handlers, derived values, useSyncExternalStore or server data.",
    test: (line) => /\buseEffect\s*\(/u.test(line),
  },
  {
    id: "lint-off",
    why: "Switching a lint rule off hides the problem it found. Fix the code instead.",
    test: (line) => /eslint-disable/u.test(line),
  },
  {
    id: "inner-html",
    why: "dangerouslySetInnerHTML bypasses React's escaping. Render elements instead.",
    test: (line) => /dangerouslySetInnerHTML/u.test(line),
  },
  {
    id: "temporary-note",
    why: "Notes like 'for now' or 'temporary' explain a workaround, and the next change copies it. Fix the real problem.",
    test: (line) => /^\s*(\/\/|\*|\/\*|\{\/\*).*\b(for now|temporary|temporarily|hack|workaround|quick fix)\b/iu.test(line),
  },
  {
    id: "line-comment",
    why: "Comments are not checked by anything and agents copy the excuses in them. Make the code say it: a clear name, a type, a test, or a guard.",
    test: (line) => /^\s*\/\/(?!\s*guard-allow:)/u.test(line) && !/eslint-disable/u.test(line),
  },
];

/**
 * The one place a ban does not apply: small, reviewed hooks that wrap the
 * pattern correctly (cleanup, stable handlers), so product code never writes it.
 */
export const VETTED = { "use-effect": /^src\/lib\/hooks\// };

/** How many lines of a source break each banned pattern. */
export function countBanned(source) {
  const counts = Object.fromEntries(BANNED.map((rule) => [rule.id, 0]));
  for (const line of source.split("\n")) {
    for (const rule of BANNED) if (rule.test(line)) counts[rule.id] += 1;
  }
  return counts;
}

/**
 * Compares today's counts with the baseline. `counts` is { file: { rule: n } }
 * and the baseline is { rule: { file: n } }. Returns one finding per file and
 * rule that went over.
 */
export function overBaseline(counts, baseline) {
  const findings = [];
  for (const [file, perRule] of Object.entries(counts)) {
    for (const rule of BANNED) {
      if (VETTED[rule.id]?.test(file)) continue;
      const now = perRule[rule.id] ?? 0;
      const allowed = baseline[rule.id]?.[file] ?? 0;
      if (now > allowed) findings.push({ file, rule: rule.id, now, allowed, why: rule.why });
    }
  }
  return findings;
}

/** A baseline lowered to today's counts. Counts only fall; a file that is gone is dropped. */
export function tighten(counts, baseline) {
  const next = {};
  for (const rule of BANNED) {
    next[rule.id] = {};
    for (const [file, allowed] of Object.entries(baseline[rule.id] ?? {})) {
      const now = counts[file]?.[rule.id];
      if (now === undefined) continue;
      const kept = Math.min(now, allowed);
      if (kept > 0) next[rule.id][file] = kept;
    }
  }
  return next;
}

/** The first baseline: every count as it is today. Only used when none exists. */
export function initialBaseline(counts) {
  const base = Object.fromEntries(BANNED.map((rule) => [rule.id, {}]));
  for (const [file, perRule] of Object.entries(counts)) {
    for (const rule of BANNED) if ((perRule[rule.id] ?? 0) > 0) base[rule.id][file] = perRule[rule.id];
  }
  return base;
}
