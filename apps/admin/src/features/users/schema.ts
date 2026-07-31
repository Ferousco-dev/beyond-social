import { z } from "zod";

/**
 * Every shape that crosses a boundary in this feature: the query string, the
 * rows the database returns, and the fields an action accepts.
 */

export const PAGE_SIZE = 25;

/** `created_at|id`, the keyset cursor as it survives a round trip in a URL. */
const cursorSchema = z
  .string()
  .trim()
  .max(120)
  .refine((value) => value === "" || parseCursor(value) !== null)
  .catch("");

export const userQuerySchema = z.object({
  q: z.string().trim().max(320).catch(""),
  cursor: cursorSchema,
});

export type UserQuery = z.infer<typeof userQuerySchema>;

export interface Cursor {
  readonly createdAt: string;
  readonly id: string;
}

export function parseCursor(value: string): Cursor | null {
  const separator = value.lastIndexOf("|");
  if (separator < 1) return null;
  const createdAt = value.slice(0, separator);
  const id = value.slice(separator + 1);
  const valid = z.string().uuid().safeParse(id).success && !Number.isNaN(Date.parse(createdAt));
  return valid ? { createdAt, id } : null;
}

export function formatCursor(cursor: Cursor): string {
  return `${cursor.createdAt}|${cursor.id}`;
}

export const userRowSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  fullName: z.string().nullable(),
  plan: z.string(),
  role: z.string(),
  creditsUsed: z.number().int(),
  creditsTotal: z.number().int(),
  suspendedAt: z.string().nullable(),
  createdAt: z.string(),
});

export type UserRow = z.infer<typeof userRowSchema>;

export const userDetailSchema = userRowSchema.extend({
  creditsPeriodStart: z.string(),
  projectCount: z.number().int(),
  generationCount: z.number().int(),
  messageCount: z.number().int(),
  lastActiveAt: z.string().nullable(),
  suspendedReason: z.string().nullable(),
  suspendedByEmail: z.string().nullable(),
  subscriptionStatus: z.string().nullable(),
  subscriptionPlan: z.string().nullable(),
  subscriptionPeriodEnd: z.string().nullable(),
  subscriptionCancelAtPeriodEnd: z.boolean().nullable(),
});

export type UserDetail = z.infer<typeof userDetailSchema>;

export interface UserPage {
  readonly rows: readonly UserRow[];
  /** The cursor for the following page, or null when this is the last one. */
  readonly nextCursor: string | null;
}

export function usersHref(query: Pick<UserQuery, "q">, cursor?: string): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (cursor) params.set("cursor", cursor);
  const search = params.toString();
  return search ? `/users?${search}` : "/users";
}
