import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Which organisation the current AI work belongs to.
 *
 * Spend is governed per organisation, not per member in turn, so usage that
 * cannot be grouped by org cannot be budgeted by one. `ai_usage.org_id` exists
 * for that and had nothing filling it.
 *
 * Unlike the user, the org is not known when the request starts. It is a
 * property of the project being worked on, and which project that is gets
 * decided partway through the turn, sometimes by creating one. So this is a
 * slot opened at the boundary and filled once the answer is known, rather than
 * a value wrapped around the work the way `runWithAiUser` does it. The
 * alternative was threading an org id through classify, enhance, reply, extract
 * and summarise, none of which have any other reason to know about
 * organisations.
 *
 * Null is the ordinary case and always will be: a personal project has no
 * organisation, which is every project today.
 */
interface OrgSlot {
  orgId: string | null;
}

const storage = new AsyncLocalStorage<OrgSlot>();

/** Opens a slot for this request. Without one, `setAiOrg` is a no-op. */
export function withAiOrgSlot<T>(fn: () => T): T {
  return storage.run({ orgId: null }, fn);
}

/**
 * Records which organisation this work is for, once that is known.
 *
 * Safe to call outside a slot, where it does nothing: attribution is worth
 * having and never worth failing a turn over.
 */
export function setAiOrg(orgId: string | null): void {
  const slot = storage.getStore();
  if (slot) slot.orgId = orgId;
}

/** The current organisation, or undefined for personal work and background jobs. */
export function currentAiOrg(): string | undefined {
  return storage.getStore()?.orgId ?? undefined;
}
