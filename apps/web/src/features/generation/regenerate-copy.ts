/**
 * Copy shared between the regenerate action and the thread.
 *
 * Its own module because a `"use server"` file may only export async
 * functions, and the optimistic message the client shows has to read the same
 * as the one the server stored.
 */
export const REGENERATE_REPLY = "Running that again.";
