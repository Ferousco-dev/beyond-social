import { platformLabel as labelFor } from "@/lib/dashboard/analytics";
import { type GenerationStatus, type PostStatus, type SocialPlatform } from "@/lib/supabase/types";

/**
 * The shapes the overview renders.
 *
 * Every field here is answerable from our own tables. Views, reach and
 * engagement are absent on purpose: they need platform insights APIs we have
 * not integrated, and this screen previously showed invented versions of them.
 */

/** One rolling window for the whole screen, so every number carries the same timeframe. */
export const WINDOW_DAYS = 30;
export const WINDOW_LABEL = "Last 30 days";

export type RunningStatus = Extract<GenerationStatus, "queued" | "generating">;
export type PendingStatus = Extract<PostStatus, "scheduled" | "publishing">;

export interface RunningGeneration {
  readonly id: string;
  readonly projectId: string;
  readonly projectTitle: string | null;
  readonly prompt: string;
  readonly status: RunningStatus;
  readonly startedAt: string;
}

export interface UpcomingPost {
  readonly id: string;
  readonly platform: SocialPlatform;
  readonly caption: string;
  readonly scheduledFor: string;
  readonly status: PendingStatus;
}

export interface AttentionItem {
  readonly id: string;
  readonly source: "generation" | "post";
  readonly title: string;
  /** The provider or platform error, when one was recorded. Never invented. */
  readonly reason: string | null;
  readonly at: string;
  readonly projectId: string | null;
}

export interface ActivityEvent {
  readonly id: string;
  readonly kind: "generated" | "published";
  readonly title: string;
  readonly platform: SocialPlatform | null;
  readonly at: string;
}

/** A capped list plus the true total, so "5 shown" never reads as "5 exist". */
export interface Capped<T> {
  readonly items: readonly T[];
  readonly total: number;
}

export interface PeriodCounts {
  readonly generated: number;
  readonly ready: number;
  readonly failed: number;
  readonly published: number;
  readonly projectsStarted: number;
}

export interface CreditBalance {
  readonly total: number;
  readonly used: number;
  readonly resetsInDays: number;
}

export interface OverviewSnapshot {
  readonly running: Capped<RunningGeneration>;
  readonly upcoming: Capped<UpcomingPost>;
  readonly attention: Capped<AttentionItem>;
  readonly activity: readonly ActivityEvent[];
  readonly counts: PeriodCounts;
  /** Null when the balance cannot be read, rather than a placeholder number. */
  readonly credits: CreditBalance | null;
  readonly timeZone: string;
}

/** The shared label map, narrowed to the enum this screen actually reads. */
export function platformLabel(platform: SocialPlatform): string {
  return labelFor(platform);
}

/** A prompt or caption is free text and often long. Lists need a stable stub. */
export function summarise(text: string, fallback: string): string {
  const trimmed = text.trim();
  return trimmed === "" ? fallback : trimmed;
}
