import "server-only";

import { FunctionsHttpError } from "@supabase/supabase-js";
import { z } from "zod";

/**
 * What every edge function here sends back on failure. See
 * `supabase/functions/_shared/http.ts`'s `json` helper and every call site
 * that reports a non-2xx: the body is always `{ error: "..." }`.
 */
const errorBodySchema = z.object({ error: z.string().min(1) });

/**
 * The real reason an edge function refused a request.
 *
 * `supabase.functions.invoke` throws away the response body: a
 * `FunctionsHttpError`'s own `.message` is hardcoded by supabase-js to "Edge
 * Function returned a non-2xx status code" no matter what the function
 * actually said. The body is still reachable on `.context`, the raw
 * `Response`, so this reads it back and pulls out the field the function
 * put there.
 *
 * Null for anything else: a `FunctionsFetchError` or `FunctionsRelayError`
 * never reached the function, so there is no response body to read, and a
 * body that does not parse is not something safe to show verbatim.
 */
export async function edgeFunctionErrorMessage(error: unknown): Promise<string | null> {
  if (!(error instanceof FunctionsHttpError)) return null;

  try {
    const body: unknown = await error.context.json();
    const parsed = errorBodySchema.safeParse(body);
    return parsed.success ? parsed.data.error : null;
  } catch {
    return null;
  }
}
