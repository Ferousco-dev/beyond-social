import { type SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/auth/supabase";

/**
 * The slice of the database this feature is allowed to touch.
 *
 * Two SECURITY DEFINER functions from 0042, both of which raise unless
 * `is_admin()` passes. The `deleted_accounts_grace` view behind them is granted
 * to nobody, so there is no way to read a deleted account from here except
 * through a function that has already checked who is asking.
 */

export type DeletedDatabase = {
  public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      admin_deleted_accounts: {
        Args: Record<never, never>;
        Returns: {
          user_id: string;
          email: string;
          full_name: string | null;
          deleted_at: string;
          deletion_reason: string | null;
          deleted_by_email: string | null;
          erasable_at: string;
          days_remaining: number;
          past_grace_period: boolean;
        }[];
      };
      admin_restore_account: {
        Args: { p_user: string };
        Returns: { id: string; email: string; deleted_at: string | null }[];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type DeletedClient = SupabaseClient<DeletedDatabase, "public">;

/**
 * A session-scoped client typed for this feature. The cookie plumbing lives in
 * `lib/auth`, so the console has one session client rather than several that
 * could disagree about who is signed in.
 */
export async function createDeletedClient(): Promise<DeletedClient> {
  return (await createClient()) as unknown as DeletedClient;
}
