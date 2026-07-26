"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { disconnect } from "@/lib/social/connections";
import { SOCIAL_PLATFORMS } from "@/lib/social/platforms";

const schema = z.object({ platform: z.enum(SOCIAL_PLATFORMS) });

export type DisconnectResult = { status: "ok" } | { status: "error"; message: string };

/** Revokes a connection. The tokens are cleared in the database, not just flagged. */
export async function disconnectPlatform(input: z.input<typeof schema>): Promise<DisconnectResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Unknown platform" };

  try {
    await disconnect(parsed.data.platform);
    revalidatePath("/dashboard/settings/connections");
    return { status: "ok" };
  } catch (error) {
    logger.error("disconnect failed", {
      platform: parsed.data.platform,
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "Could not disconnect that account." };
  }
}
