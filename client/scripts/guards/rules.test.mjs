// Each guard is shown the mistake it was written for, so a guard that stops
// catching it fails here first.
import assert from "node:assert/strict";
import test from "node:test";

import { RULES, appPaths, clientValueImports, routeExists } from "./rules.mjs";

const rule = (id) => {
  const found = RULES.find((item) => item.id === id);
  assert.ok(found, `rule ${id} exists`);
  return found;
};

test("no-em-dash catches an em dash and passes a hyphen", () => {
  assert.equal(rule("no-em-dash").line('value={ok ? count : "—"}'), true);
  assert.equal(rule("no-em-dash").line('value={ok ? count : "-"}'), false);
});

test("no-blue-field-focus catches the old blue ring", () => {
  assert.equal(rule("no-blue-field-focus").line('className="h-11 focus:outline-2 focus:outline-primary"'), true);
  assert.equal(rule("no-blue-field-focus").line('className="h-11 focus:border-ink/30"'), false);
});

test("no-black-action-buttons catches a black button and passes the blue one", () => {
  assert.equal(rule("no-black-action-buttons").line('className="inline-flex h-9 rounded-full bg-ink px-4 text-xs text-canvas"'), true);
  assert.equal(rule("no-black-action-buttons").line('className="btn btn-primary btn-sm"'), false);
  assert.equal(rule("no-black-action-buttons").line('className="focus:bg-ink focus:text-canvas"'), false);
});

test("no-decorative-dot catches a small blue dot", () => {
  assert.equal(rule("no-decorative-dot").line('<span className="size-1.5 shrink-0 rounded-full bg-primary" />'), true);
  assert.equal(rule("no-decorative-dot").line('<span className="size-10 rounded-full bg-primary" />'), false);
});

test("no-sparkle-ai-icon catches the sparkle AI icon and allows the bulb", () => {
  assert.equal(rule("no-sparkle-ai-icon").line('import { ArrowUp, Sparkles, Undo2 } from "lucide-react";'), true);
  assert.equal(rule("no-sparkle-ai-icon").line('<WandSparkles className="size-4" />'), true);
  assert.equal(rule("no-sparkle-ai-icon").line('import { ArrowUp, Lightbulb } from "lucide-react";'), false);
});

test("no-letter-platform-logo catches a letter standing in for a platform logo", () => {
  assert.equal(rule("no-letter-platform-logo").line('<span className="grid size-5 rounded-full bg-black text-white">T</span>'), true);
  assert.equal(rule("no-letter-platform-logo").line('<PlatformLogo platform="tiktok" className="size-4" />'), false);
  assert.equal(rule("no-letter-platform-logo").line('<span className="rounded-full px-2">Today</span>'), false);
});

test("links-to-real-pages finds app paths and checks them against routes", () => {
  const routes = ["/dashboard/admin", "/dashboard/admin/users", "/dashboard/admin/users/[id]"];
  assert.deepEqual(appPaths('{ href: "/dashboard/admin/docs" as Route }'), ["/dashboard/admin/docs"]);
  assert.equal(routeExists("/dashboard/admin/docs", routes), false);
  assert.equal(routeExists("/dashboard/admin/users", routes), true);
  assert.equal(routeExists("/dashboard/admin/users/abc", routes), true);
  assert.deepEqual(appPaths("href={`/dashboard/admin/users/${id}`}"), []);
  assert.deepEqual(appPaths('href="/dashboard/admin/users?segment=new"'), ["/dashboard/admin/users"]);
});

test("client-values-into-server catches a constant but allows a component", () => {
  const fromClient = () => true;
  const page = 'import { SpendView, WINDOWS, everyDay } from "./spend-view";\n';
  const hits = clientValueImports(page, fromClient);
  assert.equal(hits.length, 1);
  assert.deepEqual(hits[0].names, ["WINDOWS", "everyDay"]);
  assert.deepEqual(clientValueImports('import { SpendView } from "./spend-view";', fromClient), []);
  assert.deepEqual(clientValueImports('import type { Window } from "./spend-view";', fromClient), []);
  assert.deepEqual(clientValueImports('"use client";\nimport { WINDOWS } from "./spend-view";', fromClient), []);
});
