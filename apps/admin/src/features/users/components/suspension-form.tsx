"use client";

import { useActionState, useState, type ReactNode } from "react";

import { IDLE_USER_ACTION } from "../action-state";
import { setSuspensionAction } from "../actions";
import { type UserDetail } from "../schema";
import { ActionFeedback } from "./action-feedback";
import { BUTTON_DANGER, BUTTON_PRIMARY, FIELD, LABEL } from "./controls";

/**
 * Suspends or restores an account.
 *
 * Suspending takes a second click. It stops a paying customer from working
 * mid-session, and this form sits directly under figures an operator may have
 * come to read rather than to change. Restoring is a single click, because
 * undoing a mistake should never be the harder direction.
 *
 * The database refuses to suspend an administrator, so no form is offered for
 * one; the check that matters is in `admin_set_user_suspension`, not here.
 */
export function SuspensionForm({ user }: { user: UserDetail }): ReactNode {
  const [state, submit, pending] = useActionState(setSuspensionAction, IDLE_USER_ACTION);
  const [confirming, setConfirming] = useState(false);
  const suspending = user.suspendedAt === null;

  if (suspending && user.role === "admin") {
    return (
      <p className="text-sm text-ink-soft">
        This is an administrator account. Suspending one would lock the console out of itself, so it
        is refused in the database. Remove the admin role first, in a database session.
      </p>
    );
  }

  return (
    <form action={submit} onSubmit={() => setConfirming(false)} className="space-y-3">
      <input type="hidden" name="userId" value={user.id} />
      <input type="hidden" name="suspended" value={suspending ? "true" : "false"} />

      <div className="min-w-56 max-w-xl space-y-1.5">
        <label htmlFor="suspension-reason" className={LABEL}>
          Reason
        </label>
        <input
          id="suspension-reason"
          name="reason"
          type="text"
          required
          minLength={3}
          maxLength={500}
          placeholder="Recorded in the audit log and shown on this page"
          className={FIELD}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {suspending ? (
          confirming ? (
            <button type="submit" disabled={pending} className={BUTTON_DANGER}>
              {pending ? "Suspending" : "Confirm suspension"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={`${BUTTON_DANGER} cursor-pointer`}
            >
              Suspend account
            </button>
          )
        ) : (
          <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
            {pending ? "Restoring" : "Restore account"}
          </button>
        )}
        <ActionFeedback state={state} />
      </div>

      <p className="text-sm text-ink-soft">
        A suspended account keeps everything it has made and can still read, export and delete it.
        What stops is creating: no new project, message, upload, generation or scheduled post. The
        database enforces that on every path, including the API key routes that run as the service
        role.
      </p>
    </form>
  );
}
