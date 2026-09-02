import { z } from "zod";

import { sendSchema } from "@/lib/chat/send-schema";

/**
 * A turn written, sent, and waiting on one answer about what it will cost.
 *
 * The clarifying questions hold a turn in React state, which is enough for
 * them: nothing was created, and a reload simply loses a question nobody had
 * answered. This one is different. The server has already priced the request
 * and the person is deciding whether to spend twenty times the usual on it, so
 * losing that to a refresh means asking them to write the brief again.
 *
 * Session storage, like the composer seed, and for the same reason: it belongs
 * to this tab and this sitting, and it is not worth a row in the database when
 * nothing has been created for it to hang off.
 */

const KEY = "bs:held-turn";

const upgradeSchema = z.object({
  modelId: z.string().min(1),
  reason: z.string(),
  creditCost: z.number(),
  alternativeCost: z.number(),
  balance: z.number(),
});

const heldSchema = z.object({ payload: sendSchema, upgrade: upgradeSchema });

/** A turn, and the costlier model it is waiting to be told about. */
export type HeldTurn = z.infer<typeof heldSchema>;

export function holdTurn(held: HeldTurn): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(held));
  } catch {
    // A full or blocked store must not cost the user the answer they are about
    // to give: the card is already on screen and works without this.
  }
}

export function releaseHeldTurn(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do. The read below discards anything that does not parse, and
    // a value that cannot be removed cannot have been written either.
  }
}

/**
 * The held turn for this thread, or nothing.
 *
 * Parsed rather than trusted: session storage is the user's to edit, and a
 * price or a model id read straight out of it would be a claim about what the
 * server offered. The server checks the answer against its own selection
 * anyway, so the worst a doctored value can do is show the wrong number, and
 * that is worth refusing too.
 *
 * A value belonging to another project is left where it is: the answer to it is
 * still owed, and the thread it belongs to is one navigation away.
 */
export function readHeldTurn(projectId: string): HeldTurn | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  try {
    const parsed = heldSchema.safeParse(JSON.parse(raw) as unknown);
    if (!parsed.success) {
      releaseHeldTurn();
      return null;
    }
    return parsed.data.payload.projectId === projectId ? parsed.data : null;
  } catch {
    releaseHeldTurn();
    return null;
  }
}
