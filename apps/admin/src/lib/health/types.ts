/**
 * Every panel payload carries `observedAt`, taken from the database clock at
 * query time. A page can be cached, a tab can be left open overnight, and a
 * monitoring view with no timestamp is a way to look at yesterday and think it
 * is now. The timestamp is not optional anywhere in this module.
 */
export interface Observed {
  observedAt: Date;
}

export type StuckKind = "generation" | "publish";

export interface StuckItem {
  kind: StuckKind;
  id: string;
  /** Provider and model for a generation, platform for a post. */
  detail: string;
  /** When the item entered the state it never left. */
  since: Date;
}

export interface StuckPipeline extends Observed {
  generatingStuck: number;
  publishingStuck: number;
  items: StuckItem[];
}

export interface FailureItem {
  kind: StuckKind;
  id: string;
  detail: string;
  error: string;
  failedAt: Date;
}

export interface FailureFeed extends Observed {
  failedGenerations: number;
  failedPosts: number;
  items: FailureItem[];
}

export interface ProviderFailures {
  provider: string;
  model: string;
  calls: number;
  failures: number;
  lastError: string;
  lastFailedAt: Date | null;
}

export interface AiFailures extends Observed {
  calls: number;
  failures: number;
  providers: ProviderFailures[];
}

export interface RateLimitScope {
  /** The key prefix only. Identifiers never leave the database. */
  scope: string;
  keys: number;
  peakCount: number;
  totalCount: number;
  windowEndsAt: Date;
}

export interface RateLimitPressure extends Observed {
  activeKeys: number;
  scopes: RateLimitScope[];
}

export interface CacheHealth extends Observed {
  liveEntries: number;
  /** Expired but not yet swept, which is the signal that the sweeper stopped. */
  expiredEntries: number;
  newestEntryAt: Date | null;
  embeddingEntries: number;
  aiCalls: number;
  cachedCalls: number;
}
