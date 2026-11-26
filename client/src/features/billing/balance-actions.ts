"use server";

import { goApi } from "@/lib/go-api/client";
import { creditsResponse } from "@/lib/go-api/schemas";

/** The signed-in person's credit balance right now, or null when it cannot be read. */
export async function readBalance(): Promise<number | null> {
  const result = await goApi("/api/v1/credits", creditsResponse);
  return result.ok ? result.data.data.balance : null;
}
