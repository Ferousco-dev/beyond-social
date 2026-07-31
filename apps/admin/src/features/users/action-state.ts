/**
 * What a user action reports back to its form.
 *
 * Kept out of the "use server" module, which may only export async functions.
 * The message is written for an operator: it says what happened to the account,
 * never how the database phrased its objection internally.
 */
export interface UserActionState {
  readonly status: "idle" | "ok" | "error";
  readonly message: string;
}

export const IDLE_USER_ACTION: UserActionState = { status: "idle", message: "" };
