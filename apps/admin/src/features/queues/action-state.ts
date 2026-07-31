/**
 * The result of a retry or remove, as the form renders it.
 *
 * Kept out of the "use server" module because that file may only export async
 * functions. Messages are written for an operator, not a log: they say what
 * happened to the job, never why the infrastructure disagreed.
 */
export interface QueueActionState {
  readonly status: "idle" | "ok" | "error";
  readonly message: string;
}

export const IDLE_QUEUE_ACTION: QueueActionState = { status: "idle", message: "" };
