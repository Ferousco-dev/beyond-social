import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Who the current AI work is being done for.
 *
 * The gateway keys its rate limit on the caller's user id, and every call site
 * in this app reached it through `getChat()` with no argument. The id defaulted
 * to `anonymous`, so a single bucket was shared by everyone: one person's
 * activity throttled the whole platform, and the limit that read as "120 an
 * hour each" was really "120 an hour between you".
 *
 * Threading a user id through classify, enhance, reply, extract and summarise
 * would have meant changing every signature between the action and the model
 * call, most of which have no other reason to know who the user is. This carries
 * it out of band instead, the same way the trace id is carried.
 */
const storage = new AsyncLocalStorage<string>();

/** Runs `fn` with everything inside it attributed to this user. */
export function runWithAiUser<T>(userId: string, fn: () => T): T {
  return storage.run(userId, fn);
}

/**
 * The current user id, or undefined outside a request.
 *
 * Undefined is correct for cron work and trend discovery: that load is the
 * platform's own, not any one person's, and charging it to a user's bucket
 * would throttle them for something they did not do.
 */
export function currentAiUser(): string | undefined {
  return storage.getStore();
}
