"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { clientIp } from "@/lib/auth/request";

import { type UserActionState } from "./action-state";
import { PLAN_CATALOGUE, PLAN_IDS } from "./plans";
import { setUserCredits, setUserPlan, setUserSuspension, type ActionResult } from "./rpc";

/**
 * The three things an operator can change about an account.
 *
 * Each one is a thin wrapper: the database function re-checks that the caller
 * is an admin, validates the values again, and writes the audit row in the same
 * transaction as the change. So these actions are a convenience for the form,
 * never the security boundary, and an action cannot succeed unaudited.
 */

/** A reason is mandatory: it becomes the audit row's summary. */
const reason = z.string().trim().min(3).max(500);
const userId = z.string().uuid();
const credits = z.coerce.number().int().min(0).max(1_000_000);

const creditsSchema = z.object({
  userId,
  creditsTotal: credits,
  creditsUsed: credits,
  reason,
});

const planSchema = z.object({
  userId,
  plan: z.enum(PLAN_IDS),
  reason,
});

const suspensionSchema = z.object({
  userId,
  suspended: z.enum(["true", "false"]).transform((value) => value === "true"),
  reason,
});

export async function adjustCreditsAction(
  _previous: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  await requireAdmin();

  const input = creditsSchema.safeParse(fields(formData));
  if (!input.success) {
    return invalid("Enter whole, non-negative credit figures and a reason of at least 3 characters.");
  }

  const { userId: id, creditsTotal, creditsUsed, reason: why } = input.data;
  return report(
    await setUserCredits(id, creditsTotal, creditsUsed, why, await ip()),
    id,
    `Credits set to ${creditsUsed} of ${creditsTotal}.`,
  );
}

export async function changePlanAction(
  _previous: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  await requireAdmin();

  const input = planSchema.safeParse(fields(formData));
  if (!input.success) {
    return invalid("Choose a plan from the list and give a reason of at least 3 characters.");
  }

  const { userId: id, plan, reason: why } = input.data;
  // The allowance comes from the catalogue rather than the form, so a plan and
  // the credits it includes cannot drift apart. Bespoke amounts are a credit
  // adjustment, which is a separate action and reads as one in the audit log.
  const chosen = PLAN_CATALOGUE[plan];

  return report(
    await setUserPlan(id, chosen.id, chosen.credits, why, await ip()),
    id,
    `Plan set to ${chosen.name}, with ${chosen.credits} credits. Stripe still owns the subscription.`,
  );
}

export async function setSuspensionAction(
  _previous: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  await requireAdmin();

  const input = suspensionSchema.safeParse(fields(formData));
  if (!input.success) {
    return invalid("A reason of at least 3 characters is required to suspend or restore.");
  }

  const { userId: id, suspended, reason: why } = input.data;
  return report(
    await setUserSuspension(id, suspended, why, await ip()),
    id,
    suspended
      ? "Account suspended. It can still read and export its work, but can create nothing."
      : "Account restored.",
  );
}

function fields(formData: FormData): Record<string, FormDataEntryValue | null> {
  return Object.fromEntries(formData.entries());
}

function invalid(message: string): UserActionState {
  return { status: "error", message };
}

async function ip(): Promise<string | null> {
  return clientIp(await headers());
}

/**
 * Turns a database result into something an operator can act on, and refreshes
 * the account page so the figures shown match what was just written.
 */
function report(result: ActionResult, id: string, success: string): UserActionState {
  if (!result.ok) {
    return { status: "error", message: `Nothing was changed. ${result.message}` };
  }
  revalidatePath(`/users/${id}`);
  revalidatePath("/users");
  return { status: "ok", message: success };
}
