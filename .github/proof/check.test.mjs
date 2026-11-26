import assert from "node:assert/strict";
import test from "node:test";

import { hasProof } from "./check.mjs";

test("a screenshot under Proof passes", () => {
  assert.equal(hasProof("## Proof\n\n![New Video](https://github.com/user-attachments/assets/abc)\n\n## Checks run"), true);
});

test("ticking No visible change passes", () => {
  assert.equal(hasProof("## Proof\n\n- [x] No visible change (server only)\n"), true);
});

test("an empty Proof section, the template's own comment, or no section fails", () => {
  assert.equal(hasProof("## Proof\n\n<!-- screenshots .png here -->\n\n- [ ] No visible change\n"), false);
  assert.equal(hasProof("## What changed\nStuff"), false);
  assert.equal(hasProof(undefined), false);
});
