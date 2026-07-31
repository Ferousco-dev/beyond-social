import { type z } from "zod";

/**
 * The slice of a Supabase client this layer needs. Depending on the shape
 * rather than the concrete client keeps the analytics layer usable from a
 * server component, a route handler or a test double without any of them
 * having to agree on how the client was built.
 */
export interface AnalyticsClient {
  rpc(
    fn: string,
    args?: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

/** A privileged read that the database refused or returned in an unusable shape. */
export class AnalyticsError extends Error {
  constructor(
    readonly fn: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(`${fn}: ${message}`, options);
    this.name = "AnalyticsError";
  }
}

/**
 * True when the database rejected the caller. Every analytics function raises
 * 'Admin only' from `is_admin()`, so this is how a page tells "not allowed"
 * apart from "something broke" without inspecting message strings itself.
 */
export function isForbidden(error: unknown): boolean {
  return error instanceof AnalyticsError && error.message.includes("Admin only");
}

/** Calls a set-returning admin function and validates every row. */
export async function selectRows<T extends z.ZodTypeAny>(
  client: AnalyticsClient,
  fn: string,
  schema: T,
  args?: Record<string, unknown>,
): Promise<z.infer<T>[]> {
  const { data, error } = await client.rpc(fn, args);

  if (error) {
    throw new AnalyticsError(fn, error.message);
  }

  const parsed = schema.array().safeParse(data ?? []);
  if (!parsed.success) {
    throw new AnalyticsError(fn, "unexpected row shape", { cause: parsed.error });
  }

  return parsed.data;
}

/**
 * Calls an admin function that returns exactly one row. Postgres set-returning
 * functions still come back as an array, so an empty result is a real failure
 * rather than something to paper over with a default.
 */
export async function selectRow<T extends z.ZodTypeAny>(
  client: AnalyticsClient,
  fn: string,
  schema: T,
  args?: Record<string, unknown>,
): Promise<z.infer<T>> {
  const rows = await selectRows(client, fn, schema, args);
  const [row] = rows;

  if (!row) {
    throw new AnalyticsError(fn, "expected one row, got none");
  }

  return row;
}
