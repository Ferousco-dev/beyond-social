/**
 * Behaviour checks for resolving message attachments.
 *
 * The thread stores object paths and mints a signed URL on every read, so the
 * one thing that has to be right is how the storage API answers a batch signing
 * request. It does not omit paths it could not sign: it returns them with a
 * null path, which means the response cannot be read positionally. That is an
 * assumption about somebody else's API, so it is checked against the real one.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/attachments-smoke.ts
 */
import { createClient } from "@supabase/supabase-js";

import { toSignedMap } from "../src/lib/chat/attachments";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** A 1x1 transparent PNG. The smallest thing the bucket's mime list accepts. */
const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

async function main(): Promise<void> {
  if (URL === undefined || SERVICE_KEY === undefined) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  const supabase = createClient(URL, SERVICE_KEY);

  // The fixtures are uploaded rather than found. Reading whatever happened to
  // be in the bucket meant the test passed or failed on ambient state and could
  // not run at all against a freshly migrated database, which is exactly where
  // CI runs it.
  const folder = "smoke-attachments";
  const real = [`${folder}/one.png`, `${folder}/two.png`];
  for (const path of real) {
    const { error } = await supabase.storage
      .from("uploads")
      .upload(path, PIXEL_PNG, { contentType: "image/png", upsert: true });
    if (error) throw new Error(`could not seed ${path}: ${error.message}`);
  }
  check("seeded objects to sign", real.length > 0, `${real.length} objects`);

  const missing = `${folder}/does-not-exist.png`;
  const { data } = await supabase.storage.from("uploads").createSignedUrls([...real, missing], 60);

  const map = toSignedMap(data);

  // The real assertion: the response parsed, and every real path is present
  // under its own key rather than at whatever index it was sent in.
  check(
    "every real path is signed",
    real.every((path) => map.has(path)),
  );
  check(
    "signed urls point at the object they were asked for",
    real.every((path) => map.get(path)?.includes(encodeURI(path)) ?? false),
  );

  // The whole reason the response is read by path. If a failed sign were simply
  // omitted, a positional read would silently hand one object's URL to another.
  check("a path that cannot be signed is absent rather than misaligned", !map.has(missing));
  check("one bad path does not discard the good ones", map.size === real.length);

  // Left behind, the fixtures would accumulate in a real developer's bucket and
  // show up as mystery attachments the next time somebody browses it.
  await supabase.storage.from("uploads").remove(real);

  process.stdout.write(
    `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
  );
  if (failures > 0) process.exit(1);
}

void main();
