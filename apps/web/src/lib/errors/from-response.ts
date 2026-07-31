import { z } from "zod";

import { AppError, statusError } from "./app-error";
import { codeFromWire } from "./codes";

/**
 * Mirrors `TRACE_HEADER` in `lib/observability/http.ts`, which is `server-only`
 * and therefore cannot be imported into browser code. The literal is duplicated
 * rather than the module split, because one string is a smaller thing to keep in
 * step than a shared module that both the server and the client can reach.
 */
export const TRACE_ID_HEADER = "x-trace-id";

/** The error envelope every API route returns. */
const envelopeSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  trace_id: z.string().optional(),
});

/**
 * Turns a non-OK `Response` into an `AppError` carrying its trace id.
 *
 * This is the only place a trace id crosses from the server into something the
 * user can be shown, which is what makes "quote the reference" a workable
 * support instruction rather than a slogan.
 */
export async function errorFromResponse(response: Response): Promise<AppError> {
  const headerTraceId = response.headers.get(TRACE_ID_HEADER) ?? undefined;

  const body: unknown = await response.json().catch(() => null);
  const parsed = envelopeSchema.safeParse(body);
  if (!parsed.success) return statusError(response.status, headerTraceId);

  return new AppError(codeFromWire(parsed.data.error), parsed.data.message ?? parsed.data.error, {
    traceId: parsed.data.trace_id ?? headerTraceId,
  });
}
