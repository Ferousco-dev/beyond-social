import { z } from "zod";

const ipSchema = z.string().ip();

/**
 * The caller's IP, or null when it cannot be established.
 *
 * The audit log stores this in an `inet` column, so an unparseable value is a
 * failed insert rather than a bad row. Header contents are attacker-influenced,
 * hence the schema check before anything reaches the database.
 */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  const candidate = forwarded?.split(",")[0]?.trim() ?? headers.get("x-real-ip")?.trim() ?? "";
  const parsed = ipSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
