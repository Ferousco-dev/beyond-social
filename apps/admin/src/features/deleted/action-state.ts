/**
 * What a restore reports back to its dialog.
 *
 * Kept out of the "use server" module, which may only export async functions.
 * The message is written for an operator: it says what happened to the account,
 * never how the database phrased its objection internally.
 */
export interface RestoreActionState {
  readonly status: "idle" | "ok" | "error";
  readonly message: string;
}

export const IDLE_RESTORE_ACTION: RestoreActionState = { status: "idle", message: "" };
