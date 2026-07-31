import { z } from "zod";

/**
 * Environment for the console, split by who is allowed to see it.
 *
 * Unlike the web app, Supabase is not optional here: a console that renders
 * without a session backend is a console with no access control, so the schema
 * requires the values rather than defaulting them to empty.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_ADMIN_URL: z.string().url().default("http://localhost:3001"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

function parse<TSchema extends z.ZodType>(
  schema: TSchema,
  runtime: Record<string, string | undefined>,
): z.infer<TSchema> {
  const parsed = schema.safeParse(runtime);
  if (!parsed.success) {
    const report = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${report}`);
  }
  return parsed.data;
}

/**
 * Read lazily, like `serverEnv` below.
 *
 * Parsing at module scope would make Supabase a requirement of `next build`
 * itself, since collecting page data evaluates every module the route tree
 * imports. The check still cannot be skipped: every request path builds a
 * client, so a console deployed without these values fails every request
 * loudly rather than serving pages with no access control.
 *
 * Next inlines NEXT_PUBLIC_* only when referenced as a literal property access,
 * so these cannot be read from a loop over process.env.
 */
export function env(): z.infer<typeof publicEnvSchema> {
  return parse(publicEnvSchema, {
    NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

/**
 * Read lazily. Evaluating this at module scope would make the service role key
 * a load-time requirement of any module that transitively imports it, including
 * ones that only need the anon client.
 */
export function serverEnv(): z.infer<typeof serverEnvSchema> {
  return parse(serverEnvSchema, {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
