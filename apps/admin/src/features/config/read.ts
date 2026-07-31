import "server-only";

import { cache } from "react";
import { z } from "zod";

import { CONFIG_DEFAULTS, type ConfigKey } from "./defaults";
import { fetchConfigRows } from "./rpc";
import { type ConfigJson, type ConfigRow } from "./schemas";

/**
 * Typed configuration reads.
 *
 * The contract is that a read never throws. An unreadable table, a missing key
 * or a value of the wrong type all fall back to the documented default in
 * `defaults.ts` and log why, because a page that fails to render is a worse
 * outcome than a page running on last known good numbers. `cache` scopes the
 * fetch to one request, so a page reading ten keys makes one round trip.
 */
const loadConfigMap = cache(async (): Promise<ReadonlyMap<string, ConfigRow>> => {
  const rows = await fetchConfigRows();
  if (!rows) {
    console.warn("app_config could not be read, every key falls back to its documented default");
    return new Map();
  }
  return new Map(rows.map((row) => [row.key, row]));
});

async function readValue(key: ConfigKey): Promise<ConfigJson> {
  const fallback = CONFIG_DEFAULTS[key];
  const row = (await loadConfigMap()).get(key);

  if (!row) {
    console.warn(`app_config has no row for ${key}, using the documented default`);
    return fallback.value;
  }
  if (row.value_type !== fallback.type) {
    console.warn(
      `app_config key ${key} is declared ${row.value_type} but the code expects ${fallback.type}, using the documented default`,
    );
    return fallback.value;
  }
  return row.value;
}

async function readTyped<T extends ConfigJson>(
  key: ConfigKey,
  schema: z.ZodType<T>,
): Promise<T> {
  const parsed = schema.safeParse(await readValue(key));
  if (parsed.success) return parsed.data;

  console.warn(`app_config key ${key} failed validation, using the documented default`);
  // The default is validated too: a wrong default should surface as a thrown
  // error in development rather than propagate a bad value into a page.
  return schema.parse(CONFIG_DEFAULTS[key].value);
}

export function getConfigNumber(key: ConfigKey): Promise<number> {
  return readTyped(key, z.number().finite());
}

export function getConfigString(key: ConfigKey): Promise<string> {
  return readTyped(key, z.string());
}

export function getConfigBoolean(key: ConfigKey): Promise<boolean> {
  return readTyped(key, z.boolean());
}

/** For `json` keys, where the caller owns the shape. */
export function getConfigJson<T extends ConfigJson>(
  key: ConfigKey,
  schema: z.ZodType<T>,
): Promise<T> {
  return readTyped(key, schema);
}
