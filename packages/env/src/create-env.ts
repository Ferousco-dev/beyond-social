import { type z, type ZodType } from "zod";

/**
 * Validate a bag of environment variables against a Zod schema.
 *
 * Environment configuration is an untyped external boundary. We fail loudly at
 * startup with a readable report so a missing or malformed value surfaces
 * immediately instead of leaking `undefined` deep into request handling.
 */
export function parseEnv<TSchema extends ZodType>(
  schema: TSchema,
  runtimeEnv: Record<string, string | undefined>,
): z.infer<TSchema> {
  const parsed = schema.safeParse(runtimeEnv);

  if (!parsed.success) {
    const report = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid environment variables:\n${report}`);
  }

  return parsed.data;
}
