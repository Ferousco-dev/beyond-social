import { type ConfigJson, type ConfigValueType } from "./schemas";

/**
 * The documented fallback for every key, and the type it must have.
 *
 * This mirrors the seed in migration 0033, which in turn mirrors constants that
 * exist in the codebase today. It is duplication on purpose: a read must never
 * crash a page, so an unreachable database, a deleted row or a value of the
 * wrong type all resolve to the number the code would have used anyway.
 */
interface ConfigDefault {
  readonly type: ConfigValueType;
  readonly value: ConfigJson;
}

export const CONFIG_DEFAULTS = {
  "ai_gateway.request_timeout_ms": { type: "number", value: 60_000 },
  "ai_gateway.retry_attempts": { type: "number", value: 3 },
  "ai_gateway.retry_base_delay_ms": { type: "number", value: 500 },
  "ai_gateway.retry_max_delay_ms": { type: "number", value: 8_000 },
  "ai_gateway.response_cache_ttl_ms": { type: "number", value: 3_600_000 },
  "ai_gateway.output_token_reserve": { type: "number", value: 4_096 },
  "ai_gateway.breaker_failure_threshold": { type: "number", value: 5 },
  "ai_gateway.breaker_cooldown_ms": { type: "number", value: 30_000 },
  "ai_limits.token_bucket_capacity": { type: "number", value: 120_000 },
  "ai_limits.token_bucket_refill_per_sec": { type: "number", value: 400 },
  "ai_limits.shared_hourly_calls": { type: "number", value: 120 },
  "ai_limits.shared_window_seconds": { type: "number", value: 3_600 },
  "public_api.rate_limit_capacity": { type: "number", value: 60 },
  "public_api.rate_limit_refill_per_sec": { type: "number", value: 1 },
  "trends.pages_per_category": { type: "number", value: 3 },
  "trends.max_per_category": { type: "number", value: 6 },
  "trends.scrape_timeout_ms": { type: "number", value: 45_000 },
} as const satisfies Record<string, ConfigDefault>;

export type ConfigKey = keyof typeof CONFIG_DEFAULTS;

export function isConfigKey(key: string): key is ConfigKey {
  return Object.hasOwn(CONFIG_DEFAULTS, key);
}
