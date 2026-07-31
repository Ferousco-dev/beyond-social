import { z } from "zod";

import { type ConfigJson, type ConfigValueType } from "./schemas";

/**
 * Text in the browser to a typed JSON value, and back.
 *
 * The database refuses a value whose jsonb type does not match `value_type`, so
 * this layer exists to turn that refusal into a sentence an operator can act on
 * before the round trip, not to be the only check.
 */

const numberInput = z
  .string()
  .trim()
  .min(1, "Enter a number.")
  .refine((raw) => Number.isFinite(Number(raw)), "That is not a number.")
  .transform((raw) => Number(raw));

const booleanInput = z.enum(["true", "false"]).transform((raw) => raw === "true");

const stringInput = z.string();

const jsonInput = z
  .string()
  .trim()
  .min(1, "Enter a JSON object or array.")
  .transform((raw, ctx): ConfigJson => {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed === null || typeof parsed !== "object") {
        ctx.addIssue({ code: "custom", message: "Enter a JSON object or array." });
        return z.NEVER;
      }
      return parsed as ConfigJson;
    } catch {
      ctx.addIssue({ code: "custom", message: "That is not valid JSON." });
      return z.NEVER;
    }
  });

export type ParsedValue = { ok: true; value: ConfigJson } | { ok: false; message: string };

/** Parses one submitted field against its declared type. */
export function parseConfigInput(type: ConfigValueType, raw: string): ParsedValue {
  const schema =
    type === "number"
      ? numberInput
      : type === "boolean"
        ? booleanInput
        : type === "json"
          ? jsonInput
          : stringInput;

  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, message: result.error.issues[0]?.message ?? "That value is not valid." };
  }
  return { ok: true, value: result.data };
}

/** The value as the operator should see and edit it. */
export function formatConfigValue(type: ConfigValueType, value: ConfigJson): string {
  if (type === "string") return typeof value === "string" ? value : JSON.stringify(value);
  if (type === "json") return JSON.stringify(value, null, 2);
  return String(value);
}
