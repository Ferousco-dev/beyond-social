/**
 * Behaviour checks for `edgeFunctionErrorMessage`.
 *
 * The bug this guards against: `supabase.functions.invoke` replaces whatever
 * an edge function actually said with a library-hardcoded string on every
 * `FunctionsHttpError`, so a caller that reads `error.message` shows the same
 * generic text for a rejected model as for an out-of-credits provider. The
 * real reason only survives on `error.context`, a `Response`.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/edge-error-smoke.ts
 */
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";

import { edgeFunctionErrorMessage } from "../src/lib/supabase/function-error";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

/** A `Response` stand-in: only `.json()` is ever called on `error.context`. */
function fakeResponse(body: unknown): Response {
  return { json: () => Promise.resolve(body) } as Response;
}

async function main(): Promise<void> {
  {
    // What generate-video actually sends on the credits case this fix exists
    // for: `json({ error: OUT_OF_FUNDS_NOTICE, generationId }, 502)`.
    const notice =
      "Video generation is paused while we top up our render provider. Your credits were not spent, so this will work again shortly.";
    const error = new FunctionsHttpError(fakeResponse({ error: notice, generationId: "gen_1" }));
    const detail = await edgeFunctionErrorMessage(error);
    check("reads the real body off a FunctionsHttpError", detail === notice, String(detail));
  }
  {
    const error = new FunctionsHttpError(
      fakeResponse({ error: "That avatar model is not available" }),
    );
    check(
      "reads a different function's body just as well",
      (await edgeFunctionErrorMessage(error)) === "That avatar model is not available",
    );
  }
  {
    // No response ever came back, so there is no body to read.
    const error = new FunctionsFetchError({ message: "network down" });
    check(
      "a fetch failure has no body, so this is null",
      (await edgeFunctionErrorMessage(error)) === null,
    );
  }
  {
    const error = new FunctionsRelayError({ message: "relay down" });
    check("a relay failure has no body either", (await edgeFunctionErrorMessage(error)) === null);
  }
  {
    // Malformed or unexpected shape: never shown verbatim.
    const error = new FunctionsHttpError(fakeResponse({ message: "wrong field name" }));
    check(
      "an unrecognised body shape is null, not shown raw",
      (await edgeFunctionErrorMessage(error)) === null,
    );
  }
  {
    const error = new FunctionsHttpError({
      json: () => Promise.reject(new Error("not JSON")),
    } as unknown as Response);
    check(
      "a body that fails to parse is null, not thrown",
      (await edgeFunctionErrorMessage(error)) === null,
    );
  }
  {
    check(
      "a plain Error is not a FunctionsHttpError, so null",
      (await edgeFunctionErrorMessage(new Error("boom"))) === null,
    );
  }

  process.stdout.write(
    `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
  );
  if (failures > 0) process.exit(1);
}

void main();
