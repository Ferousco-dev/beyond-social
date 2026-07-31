import { type BadgeTone } from "@/components/ui/badge";

import { type FailureSource } from "./types";

/**
 * Colour carries meaning on this page rather than decoration, so the mapping
 * lives in one place: a status that reads as danger in the trace timeline must
 * read as danger in the stuck list too.
 */
const TONE_BY_STATUS: Record<string, BadgeTone> = {
  queued: "neutral",
  scheduled: "neutral",
  generating: "info",
  publishing: "info",
  ready: "success",
  published: "success",
  failed: "danger",
};

export function statusTone(status: string): BadgeTone {
  return TONE_BY_STATUS[status] ?? "neutral";
}

export const SOURCE_LABEL: Record<FailureSource, string> = {
  generation: "Generation",
  publish: "Publish",
  ai: "AI call",
};

/** UTC throughout, so a timestamp here and one in a worker log line up. */
export function formatMoment(at: Date): string {
  return at.toISOString().replace("T", " ").slice(0, 19);
}
