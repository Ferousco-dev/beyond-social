import type { LongPart } from "../core/types.ts";

/** How many clips a person may have rendering at once; the server refuses more. */
export const MAX_IN_FLIGHT = 3;

/** The positions of the parts to start now: the next pending ones, in order, while a slot is free. */
export function partsToStart(parts: readonly LongPart[], inFlightElsewhere = 0): number[] {
  const running = parts.filter((part) => part.state === "running").length + inFlightElsewhere;
  const free = Math.max(0, MAX_IN_FLIGHT - running);
  const start: number[] = [];
  parts.forEach((part, index) => {
    if (part.state === "pending" && start.length < free) start.push(index);
  });
  return start;
}

/** Every clip has finished and been copied in, so the video can be joined. */
export function allReady(parts: readonly LongPart[]): boolean {
  return parts.length > 0 && parts.every((part) => part.mediaId !== undefined);
}

/** Nothing is left to wait for or start, yet some clip failed: the person must act. */
export function stalled(parts: readonly LongPart[]): boolean {
  return parts.some((part) => part.state === "failed") && !parts.some((part) => part.state === "pending" || part.state === "running");
}
