import { z } from "zod";

/**
 * Wire shape of `admin_app_config_all` and `admin_set_app_config` in migration
 * 0033. The console's hand-written database type covers auth only, so these
 * schemas are the real contract with the database rather than a formality:
 * nothing reaches a component without passing through here.
 */

export const CONFIG_VALUE_TYPES = ["string", "number", "boolean", "json"] as const;
export type ConfigValueType = (typeof CONFIG_VALUE_TYPES)[number];

const jsonValue: z.ZodType<ConfigJson> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(z.string(), jsonValue),
  ]),
);

export type ConfigJson =
  string | number | boolean | null | ConfigJson[] | { [key: string]: ConfigJson };

export const configRowSchema = z.object({
  key: z.string().min(1),
  area: z.string().min(1),
  value: jsonValue,
  value_type: z.enum(CONFIG_VALUE_TYPES),
  description: z.string(),
  takes_effect: z.enum(["immediate", "redeploy"]),
  updated_at: z.coerce.date(),
  updated_by_email: z.string().nullable(),
});

export const configRowsSchema = z.array(configRowSchema);

export type ConfigRow = z.infer<typeof configRowSchema>;

/** Human labels for the `area` column, which is a slug in the database. */
const AREA_LABELS: Readonly<Record<string, string>> = {
  ai_gateway: "AI gateway",
  ai_limits: "AI rate limits",
  public_api: "Public API",
  trends: "Trend discovery",
};

export function areaLabel(area: string): string {
  return AREA_LABELS[area] ?? area.replaceAll("_", " ");
}
