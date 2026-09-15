import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const stuckWorkItemSchema = z.object({
  kind: z.string(),
  id: z.string(),
  user_id: z.string().nullable(),
  status: z.string(),
  detail: z.string(),
  correlation: z.string().nullable(),
  since: z.string(),
  already_posted: z.boolean(),
  retryable: z.boolean(),
});

export interface StuckWorkItem {
  kind: string;
  id: string;
  userId: string | null;
  status: string;
  detail: string;
  correlation: string | null;
  since: string;
  alreadyPosted: boolean;
  retryable: boolean;
}

export interface StuckWork {
  observedAt: string;
  generatingStuck: number;
  publishIncomplete: number;
  items: StuckWorkItem[];
}

/** The wider stuck-work list, including near-misses admin_stuck_pipeline omits. */
export async function getStuckWork(limit = 50): Promise<StuckWork | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_stuck_work", { p_limit: limit });
  if (error || !data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  const parsed = z
    .object({
      observed_at: z.string(),
      generating_stuck: z.coerce.number(),
      publish_incomplete: z.coerce.number(),
      items: z.array(stuckWorkItemSchema),
    })
    .safeParse(row);
  if (!parsed.success) return null;

  return {
    observedAt: parsed.data.observed_at,
    generatingStuck: parsed.data.generating_stuck,
    publishIncomplete: parsed.data.publish_incomplete,
    items: parsed.data.items.map((i) => ({
      kind: i.kind,
      id: i.id,
      userId: i.user_id,
      status: i.status,
      detail: i.detail,
      correlation: i.correlation,
      since: i.since,
      alreadyPosted: i.already_posted,
      retryable: i.retryable,
    })),
  };
}
