import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const deletedAccountSchema = z.object({
  user_id: z.string(),
  email: z.string().nullable(),
  full_name: z.string().nullable(),
  deleted_at: z.string(),
  deletion_reason: z.string().nullable(),
  deleted_by_email: z.string().nullable(),
  erasable_at: z.string(),
  days_remaining: z.coerce.number(),
  past_grace_period: z.boolean(),
});

export interface DeletedAccount {
  userId: string;
  email: string | null;
  fullName: string | null;
  deletedAt: string;
  deletionReason: string | null;
  deletedByEmail: string | null;
  erasableAt: string;
  daysRemaining: number;
  pastGracePeriod: boolean;
}

/** Deleted accounts, oldest first, working the grace-period queue. */
export async function getDeletedAccounts(): Promise<DeletedAccount[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_deleted_accounts");
  if (error || !data) return [];

  const rows: DeletedAccount[] = [];
  for (const row of data) {
    const parsed = deletedAccountSchema.safeParse(row);
    if (parsed.success) {
      rows.push({
        userId: parsed.data.user_id,
        email: parsed.data.email,
        fullName: parsed.data.full_name,
        deletedAt: parsed.data.deleted_at,
        deletionReason: parsed.data.deletion_reason,
        deletedByEmail: parsed.data.deleted_by_email,
        erasableAt: parsed.data.erasable_at,
        daysRemaining: parsed.data.days_remaining,
        pastGracePeriod: parsed.data.past_grace_period,
      });
    }
  }
  return rows;
}
