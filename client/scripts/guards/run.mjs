// Runs every guard over the web app's source and fails when one is broken.
// Usage: node scripts/guards/run.mjs   (exit 1 with the findings listed)
// The rules, and why each exists, are in rules.mjs. See CLAUDE.md at the repo root.

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BANNED, countBanned, initialBaseline, overBaseline, tighten } from "./ratchet.mjs";
import { RULES, appPaths, clientValueImports, routeExists } from "./rules.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|mjs|css)$/u.test(name) && !/\.test\.tsx?$/u.test(name)) out.push(full);
  }
  return out;
}

const files = walk(root);
const sources = new Map(files.map((file) => [file, readFileSync(file, "utf8")]));
const rel = (file) => path.relative(path.dirname(root), file);
const allowed = (lines, index, id) => [lines[index], lines[index - 1] ?? ""].some((text) => text.includes(`guard-allow: ${id}`));
const findings = [];

for (const [file, source] of sources) {
  const lines = source.split("\n");
  for (const rule of RULES) {
    if (!rule.files.test(file) || (rule.scope && !rule.scope.test(rel(file)))) continue;
    lines.forEach((text, index) => {
      if (rule.line(text) && !allowed(lines, index, rule.id)) findings.push(`${rel(file)}:${index + 1}  ${rule.id}: ${rule.message}`);
    });
  }
}

// Links to app pages that do not exist (26 Nov 2026: the admin "Docs" link went nowhere).
const appDir = path.join(root, "app");
const routes = files
  .filter((file) => file.startsWith(appDir) && /\/page\.tsx$/u.test(file))
  .map((file) => "/" + path.relative(appDir, path.dirname(file)).split(path.sep).filter((part) => !/^\(.*\)$/u.test(part)).join("/"));
for (const [file, source] of sources) {
  const lines = source.split("\n");
  lines.forEach((text, index) => {
    for (const target of appPaths(text)) {
      if (!routeExists(target, routes) && !allowed(lines, index, "links-to-real-pages")) {
        findings.push(`${rel(file)}:${index + 1}  links-to-real-pages: ${target} has no page.`);
      }
    }
  });
}

// Plain values imported from "use client" files into server files (26 Nov 2026: AI spend and Monitoring crashed).
function resolve(from, spec) {
  const base = spec.startsWith("@/") ? path.join(root, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null;
  if (!base) return null;
  return [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")].find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}
for (const [file, source] of sources) {
  // Only code that runs on the server: pages, layouts and routes under app/, and server actions.
  const onServer = (file.startsWith(appDir) && !/^\s*["']use client["']/u.test(source)) || /^\s*["']use server["']/u.test(source);
  if (!/\.tsx?$/u.test(file) || !onServer) continue;
  const isClientModule = (spec) => {
    const target = resolve(file, spec);
    return target !== null && /^\s*["']use client["']/u.test(sources.get(target) ?? readFileSync(target, "utf8"));
  };
  for (const hit of clientValueImports(source, isClientModule)) {
    findings.push(`${rel(file)}:${hit.line}  client-values-into-server: ${hit.names.join(", ")} from ${hit.from} is a "use client" file; move plain values to a file without it.`);
  }
}

// Dependencies the owner has not approved (owner rule: ask before adding one).
const guardsDir = path.dirname(fileURLToPath(import.meta.url));
const approved = JSON.parse(readFileSync(path.join(guardsDir, "approved-deps.json"), "utf8"));
const pkg = JSON.parse(readFileSync(path.join(guardsDir, "../../package.json"), "utf8"));
for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
  if (!approved.web.includes(name)) findings.push(`client/package.json  approved-deps: ${name} is new. Ask the owner, then add it to scripts/guards/approved-deps.json.`);
}
const goMod = readFileSync(path.join(guardsDir, "../../../server/go.mod"), "utf8");
const goDirect = [...goMod.matchAll(/^\s*([\w.\-/]+)\s+v[\w.\-+]+\s*$/gmu)].map((match) => match[1]);
for (const name of goDirect) {
  if (!approved.server.includes(name)) findings.push(`server/go.mod  approved-deps: ${name} is new. Ask the owner, then add it to scripts/guards/approved-deps.json.`);
}

// Banned patterns, held to the baseline: no file may gain any (see ratchet.mjs).
const baselineFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "baseline.json");
const counts = Object.fromEntries([...sources].filter(([file]) => /\.tsx?$/u.test(file)).map(([file, source]) => [rel(file), countBanned(source)]));
if (process.argv.includes("--init")) {
  if (existsSync(baselineFile)) {
    console.error("A baseline already exists. It can only be tightened: run with --tighten.");
    process.exit(1);
  }
  writeFileSync(baselineFile, `${JSON.stringify(initialBaseline(counts), null, 2)}\n`);
}
let baseline = existsSync(baselineFile) ? JSON.parse(readFileSync(baselineFile, "utf8")) : {};
if (process.argv.includes("--tighten")) {
  baseline = tighten(counts, baseline);
  writeFileSync(baselineFile, `${JSON.stringify(baseline, null, 2)}\n`);
  process.stdout.write("Baseline tightened to today's counts.\n");
}
for (const hit of overBaseline(counts, baseline)) {
  findings.push(`${hit.file}  ${hit.rule}: ${hit.now} here, ${hit.allowed} allowed. ${hit.why}`);
}

if (findings.length > 0) {
  console.error(`Guards found ${findings.length} problem(s):\n`);
  for (const finding of findings) console.error(`  ${finding}`);
  console.error("\nEach guard is a mistake we fixed once. See client/scripts/guards/rules.mjs.");
  process.exit(1);
}
const left = BANNED.map((rule) => `${rule.id} ${Object.values(baseline[rule.id] ?? {}).reduce((sum, n) => sum + n, 0)}`).join(", ");
process.stdout.write(`Guards passed: ${RULES.length + 3} rules and ${BANNED.length} bans over ${files.length} files.\nStill to remove: ${left}.\n`);
