import assert from "node:assert/strict";
import test from "node:test";

import { countBanned, initialBaseline, overBaseline, tighten } from "./ratchet.mjs";

test("each ban counts its pattern", () => {
  const counts = countBanned(
    [
      "useEffect(() => {}, []);",
      "// eslint-disable-next-line react-hooks/exhaustive-deps",
      '<span dangerouslySetInnerHTML={{ __html: art }} />',
      "// Skip the check for now, it is fine.",
      "// guard-allow: no-decorative-dot (a real exception)",
      "/** A doc comment on an export is fine. */",
    ].join("\n"),
  );
  assert.equal(counts["use-effect"], 1);
  assert.equal(counts["lint-off"], 1);
  assert.equal(counts["inner-html"], 1);
  assert.equal(counts["temporary-note"], 1);
  assert.equal(counts["line-comment"], 1);
});

test("a new file may not add a banned pattern", () => {
  const baseline = initialBaseline({ "a.tsx": { "use-effect": 2 } });
  const findings = overBaseline({ "a.tsx": { "use-effect": 2 }, "new.tsx": { "use-effect": 1 } }, baseline);
  assert.deepEqual(findings.map((item) => [item.file, item.rule]), [["new.tsx", "use-effect"]]);
});

test("an old file may not gain one, and may lose some", () => {
  const baseline = { "use-effect": { "a.tsx": 2 } };
  assert.equal(overBaseline({ "a.tsx": { "use-effect": 3 } }, baseline).length, 1);
  assert.equal(overBaseline({ "a.tsx": { "use-effect": 1 } }, baseline).length, 0);
});

test("tightening only ever lowers the baseline and drops deleted files", () => {
  const baseline = { "use-effect": { "a.tsx": 2, "gone.tsx": 1 } };
  const next = tighten({ "a.tsx": { "use-effect": 5 } }, baseline);
  assert.deepEqual(next["use-effect"], { "a.tsx": 2 });
  assert.deepEqual(tighten({ "a.tsx": { "use-effect": 0 } }, baseline)["use-effect"], {});
});

test("the vetted hooks folder may use useEffect; product code may not", () => {
  const counts = { "src/lib/hooks/use-event.ts": { "use-effect": 2 }, "src/features/x.tsx": { "use-effect": 1 } };
  const findings = overBaseline(counts, {});
  assert.deepEqual(findings.map((item) => item.file), ["src/features/x.tsx"]);
});
