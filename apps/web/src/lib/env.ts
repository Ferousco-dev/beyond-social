import { parseEnv } from "@beyond-social/env";
import { z } from "zod";

/**
 * Public, client-safe environment. Only NEXT_PUBLIC_* values belong here since
 * they are inlined into the browser bundle. Server-only secrets get their own
 * validated module once integrations are wired up.
 *
 * Each value is referenced explicitly (rather than spreading process.env) so
 * Next.js can statically inline it into the client build.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export const env = parseEnv(clientEnvSchema, {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
