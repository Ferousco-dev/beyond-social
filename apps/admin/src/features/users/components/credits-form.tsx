"use client";

import { useActionState, type ReactNode } from "react";

import { IDLE_USER_ACTION } from "../action-state";
import { adjustCreditsAction } from "../actions";
import { type UserDetail } from "../schema";
import { ActionFeedback } from "./action-feedback";
import { BUTTON_PRIMARY, FIELD, LABEL } from "./controls";

/**
 * Sets the allowance and the amount consumed.
 *
 * Both figures are editable because the two support cases are different: a
 * goodwill grant raises the allowance, while a generation that failed after
 * charging needs the consumed figure corrected. The change in allowance is
 * written to the customer's own credit ledger as well as the audit log, so the
 * grant is visible on their usage page rather than looking like a glitch.
 */
export function CreditsForm({ user }: { user: UserDetail }): ReactNode {
  const [state, submit, pending] = useActionState(adjustCreditsAction, IDLE_USER_ACTION);

  return (
    <form action={submit} className="space-y-3">
      <input type="hidden" name="userId" value={user.id} />

      <div className="flex flex-wrap gap-3">
        <div className="w-32 space-y-1.5">
          <label htmlFor="credits-total" className={LABEL}>
            Allowance
          </label>
          <input
            id="credits-total"
            name="creditsTotal"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={user.creditsTotal}
            className={FIELD}
          />
        </div>

        <div className="w-32 space-y-1.5">
          <label htmlFor="credits-used" className={LABEL}>
            Used
          </label>
          <input
            id="credits-used"
            name="creditsUsed"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={user.creditsUsed}
            className={FIELD}
          />
        </div>

        <div className="min-w-56 flex-1 space-y-1.5">
          <label htmlFor="credits-reason" className={LABEL}>
            Reason
          </label>
          <input
            id="credits-reason"
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
          {pending ? "Saving" : "Save credits"}
        </button>
        <ActionFeedback state={state} />
      </div>
    </form>
  );
}
