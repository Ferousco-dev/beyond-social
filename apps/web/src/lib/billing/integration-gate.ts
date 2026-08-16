import "server-only";

import { getCurrentPlan } from "./current-plan";
import { hasIntegrations, INTEGRATIONS_PLAN } from "./entitlements";
import { PLAN_CATALOGUE } from "./plans";

/**
 * The server-side gate on the integration surfaces.
 *
 * Hiding a panel is not a gate: a server action is a public endpoint, and a
 * hidden form still has a callable URL behind it. Every action that mints a key
 * or registers an endpoint asks this first, so the plan decides on the server
 * and the interface only reflects the decision.
 *
 * Creating is gated; removing is not. Someone who has dropped off the plan must
 * still be able to revoke a key they minted while on it, and locking them out
 * of their own cleanup would leave live credentials they cannot reach.
 */

/** One sentence, used by the actions and by the API, so the reason reads the same everywhere. */
export const INTEGRATIONS_DENIAL = `The API, webhooks, and MCP are on the ${PLAN_CATALOGUE[INTEGRATIONS_PLAN].name} plan. Upgrade to turn them on.`;

export async function callerHasIntegrations(): Promise<boolean> {
  return hasIntegrations(await getCurrentPlan());
}
