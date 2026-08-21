// What a failed dispatch is allowed to say to the person who asked for it.
//
// The provider's reply travels all the way to the thread: `fail_generation`
// writes it onto the row and the message bubble prints it. That is the right
// design, but it means kie's own wording is user-facing wording, and one of its
// replies is actively misleading. "Credits insufficient: your current balance
// isn't enough to run this request. Please top up to continue." is about the
// platform's account with kie, not about the credits the user bought from us,
// and their balance is untouched: the reservation is handed back before this
// error is recorded. Someone reading it goes looking for a top-up button that
// would not have helped.
//
// So the balance case is rewritten and everything else is passed through. A
// provider message we have not seen before is more useful verbatim than
// flattened into "something went wrong".

/** kie's phrasing when the platform account has run dry. Matched loosely. */
const OUT_OF_FUNDS = /insufficient\s*credit|credits?\s*insufficient/i;

/**
 * Said instead. Names the side the problem is on and the fact that nothing was
 * charged, which are the two things the reader needs and neither of which the
 * provider's own message contains.
 */
const OUT_OF_FUNDS_NOTICE =
  "Video generation is paused while we top up our render provider. Your credits were not spent, so this will work again shortly.";

/**
 * Turns a provider rejection into the error that gets recorded on the run.
 *
 * `action` names the call that failed, so a message that does reach a log still
 * says which endpoint produced it.
 */
export function providerFailure(action: string, message: unknown, status: number): Error {
  const reported = typeof message === "string" && message.trim() !== "" ? message.trim() : null;
  if (reported !== null && OUT_OF_FUNDS.test(reported)) return new Error(OUT_OF_FUNDS_NOTICE);
  return new Error(`kie.ai ${action} failed: ${reported ?? status}`);
}
