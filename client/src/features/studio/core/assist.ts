import { z } from "zod";

import { addItem, deleteItem, moveItem, splitItem, trimItem, updateItem } from "./ops.ts";
import { locate } from "./find.ts";
import { type Project, type Result } from "./types.ts";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/** What the server sends back. Fields an operation does not use arrive as 0 or empty. */
export const operationSchema = z.object({
  op: z.enum(["add_text", "update_text", "delete_item", "split_item", "trim_item", "move_item", "set_volume", "seek", "set_caption_style"]),
  item_id: z.string(),
  text: z.string(),
  at: z.number(),
  start: z.number(),
  duration: z.number(),
  edge: z.string(),
  volume: z.number(),
  color: z.string(),
  size: z.number(),
  y: z.number(),
});
export type Operation = z.infer<typeof operationSchema>;

export interface Applied {
  readonly project: Project;
  /** Where the playhead should go, when the assistant asked to show something. */
  readonly seek: number | null;
  readonly applied: number;
  readonly failures: readonly string[];
}

const NEW_TEXT_SECONDS = 3;

function applyOne(project: Project, op: Operation, newId: () => string): Result<Project> | { seek: number } {
  switch (op.op) {
    case "add_text": {
      const track = project.tracks.find((t) => t.kind === "caption");
      return addItem(project, track?.id ?? "captions", {
        kind: "caption", id: newId(), start: Math.max(0, op.start), duration: op.duration > 0 ? op.duration : NEW_TEXT_SECONDS,
        text: op.text || "Text", style: { color: "#ffffff", size: 64, y: 0.8 },
      });
    }
    case "update_text":
      return updateItem(project, op.item_id, { text: op.text });
    case "delete_item":
      return deleteItem(project, op.item_id);
    case "split_item":
      return splitItem(project, op.item_id, op.at, newId());
    case "trim_item":
      return op.edge === "start" || op.edge === "end" ? trimItem(project, op.item_id, op.edge, op.at) : { ok: false, error: "Trim needs the start or the end." };
    case "move_item":
      return moveItem(project, op.item_id, op.start);
    case "set_volume":
      return updateItem(project, op.item_id, { volume: op.volume });
    case "seek":
      return { seek: Math.max(0, op.at) };
    case "set_caption_style": {
      const found = locate(project, op.item_id);
      if (!found || found.item.kind !== "caption") return { ok: false, error: "That is not a caption." };
      const style = { ...found.item.style };
      if (hex.safeParse(op.color).success) style.color = op.color;
      if (op.size > 0) style.size = op.size;
      if (op.y > 0) style.y = op.y;
      return updateItem(project, op.item_id, { style });
    }
  }
}

/**
 * Applies the assistant's operations in order. One that cannot be done is
 * reported and skipped; the rest still apply, so a single bad id does not throw
 * away a whole answer. The caller commits the result as one undo step.
 */
export function applyOperations(start: Project, operations: readonly Operation[], newId: () => string): Applied {
  let project = start;
  let seek: number | null = null;
  let applied = 0;
  const failures: string[] = [];
  for (const op of operations) {
    const result = applyOne(project, op, newId);
    if ("seek" in result) {
      seek = result.seek;
      applied += 1;
    } else if (result.ok) {
      project = result.value;
      applied += 1;
    } else failures.push(result.error);
  }
  return { project, seek, applied, failures };
}
