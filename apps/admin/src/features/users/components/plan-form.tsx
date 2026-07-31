"use client";

import { useActionState, type ReactNode } from "react";

import { IDLE_USER_ACTION } from "../action-state";
import { changePlanAction } from "../actions";
import { PLAN_IDS, PLAN_LIST } from "../plans";
import { type UserDetail } from "../schema";
import { ActionFeedback } from "./action-feedback";
import { BUTTON_PRIMARY, FIELD, LABEL } from "./controls";

/**
 * Overrides the plan, and with it the credit allowance that plan includes.
 *
 * This does not touch Stripe. The next webhook for a paying customer will
 * reassert whatever they actually bought, so this is for comping and for
 * repair, not a way to change what someone is billed.
 */
export function PlanForm({ user }: { user: UserDetail }): ReactNode {
  const [state, submit, pending] = useActionState(changePlanAction, IDLE_USER_ACTION);
  const known = (PLAN_IDS as readonly string[]).includes(user.plan);

  return (
    <form action={submit} className="space-y-3">
      <input type="hidden" name="userId" value={user.id} />

      <div className="flex flex-wrap gap-3">
        <div className="w-44 space-y-1.5">
          <label htmlFor="plan" className={LABEL}>
            Plan
          </label>
          <select
            id="plan"
            name="plan"
            required
            defaultValue={known ? user.plan : ""}
            className={FIELD}
          >
            {known ? null : (
              <option value="" disabled>
                {user.plan} (not in the catalogue)
              </option>
            )}
            {PLAN_LIST.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} ({plan.credits} credits)
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-56 flex-1 space-y-1.5">
          <label htmlFor="plan-reason" className={LABEL}>
            Reason
          </label>
          <input
            id="plan-reason"
            name="reason"
            type="text"
            required
            minLength={3}
            maxLength={500}
            placeholder="Recorded in the audit log"
            className={FIELD}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
          {pending ? "Saving" : "Change plan"}
        </button>
        <ActionFeedback state={state} />
      </div>
    </form>
  );
}
