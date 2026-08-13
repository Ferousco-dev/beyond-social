"use server";

import { type z } from "zod";

import { runWithAiUser } from "@/lib/ai/request-user";
import { sendSchema, runTurn, type SendResult } from "@/lib/chat/turn";
import { isSupabaseConfigured } from "@/lib/env";
import { withActionTrace } from "@/lib/observability/trace";
import { createClient } from "@/lib/supabase/server";

/**
 * Sending a turn.
 *
 * The boundary only: this decides who the caller is, and `runTurn` does the
 * work. The pipeline lives in `lib/chat/turn` because a streaming route needs
 * the same one, and every export from a `"use server"` file is a public
 * endpoint, so a function taking `userId` could not live here safely.
 */

export type { SendResult };

export async function sendMessage(input: z.input<typeof sendSchema>): Promise<SendResult> {
  // Everything below, including the model calls and the edge function invoke,
  // runs inside one trace, so a turn that goes wrong is one log query.
  return withActionTrace("sendMessage", () => send(input));
}

async function send(input: z.input<typeof sendSchema>): Promise<SendResult> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to continue" };

  // Everything below reaches the model gateway, and the gateway keys its rate
  // limit on this. Without it every call landed in one shared `anonymous`
  // bucket, so the whole platform throttled together.
  // The display name rides along rather than being read again downstream: it is
  // already on the session, and a greeting that does not use somebody's name is
  // colder than one that does.
  const metadataName = user.user_metadata?.full_name;
  const name = typeof metadataName === "string" ? metadataName : "";

  return runWithAiUser(user.id, () => runTurn(parsed.data, user.id, supabase, name));
}
