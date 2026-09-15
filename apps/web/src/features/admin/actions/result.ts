/** Shared shape for admin write actions: the RPCs raise on bad input, and the
 * console needs to show that message rather than swallow it. */
export type ActionResult = { ok: true } | { ok: false; error: string };

export function toActionResult(error: { message: string } | null): ActionResult {
  return error ? { ok: false, error: error.message } : { ok: true };
}
