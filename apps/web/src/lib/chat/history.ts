/**
 * The conversation as the reply writer reads it.
 *
 * A thread row is more than its text: an assistant turn can carry a draft, and
 * when that draft failed the reason is on the row rather than in anything that
 * was ever said. Without it the model answering "why did that fail" has only
 * its own earlier sentence to go on, which is the sentence that already failed
 * to explain. Folding the reason into the turn is what lets it answer from the
 * record instead of guessing.
 */

export interface ThreadTurn {
  readonly role: string;
  readonly content: string;
}

/** The shape `project_thread` returns, narrowed to what history needs. */
export interface HistoryRow {
  readonly role: string;
  readonly content: string;
  readonly generation_status?: string | null;
  readonly generation_error?: string | null;
}

/** Statuses that mean the run produced nothing. */
function isSettledWithoutVideo(status: string | null | undefined): boolean {
  return status === "failed" || status === "cancelled";
}

function describe(row: HistoryRow): string {
  if (!isSettledWithoutVideo(row.generation_status)) return row.content;

  const reason = row.generation_error?.trim();
  // Parenthesised and appended rather than woven in, so it reads as a note on
  // the turn and cannot be mistaken for something the assistant said.
  const note = reason
    ? `(The video for this turn did not finish: ${reason})`
    : "(The video for this turn did not finish.)";
  return row.content ? `${row.content}\n\n${note}` : note;
}

export function toHistory(rows: unknown): ThreadTurn[] {
  if (!Array.isArray(rows)) return [];
  return (rows as HistoryRow[]).map((row) => ({ role: row.role, content: describe(row) }));
}
