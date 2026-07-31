import { type SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/auth/supabase";

/**
 * The slice of the database this feature is allowed to touch.
 *
 * `lib/auth` types only the two functions authentication needs, on purpose, so
 * user management brings its own narrow type rather than widening a shared one.
 * Every entry here is a SECURITY DEFINER function that checks `is_admin()`
 * first: this feature reads and writes no table directly.
 */

export type UsersDatabase = {
  public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      admin_search_users: {
        Args: {
          p_query: string;
          p_cursor_created_at: string | null;
          p_cursor_id: string | null;
          p_limit: number;
        };
        Returns: {
          id: string;
          email: string;
          full_name: string | null;
          plan: string;
          role: string;
          credits_used: number;
          credits_total: number;
          suspended_at: string | null;
          created_at: string;
        }[];
      };
      admin_user_detail: {
        Args: { p_user: string };
        Returns: {
          id: string;
          email: string;
          full_name: string | null;
          plan: string;
          role: string;
          credits_used: number;
          credits_total: number;
          credits_period_start: string;
          project_count: number;
          generation_count: number;
          message_count: number;
          created_at: string;
          last_active_at: string | null;
          suspended_at: string | null;
          suspended_reason: string | null;
          suspended_by_email: string | null;
          subscription_status: string | null;
          subscription_plan: string | null;
          subscription_period_end: string | null;
          subscription_cancel_at_period_end: boolean | null;
        }[];
      };
      admin_set_user_credits: {
        Args: {
          p_user: string;
          p_total: number;
          p_used: number;
          p_reason: string;
          p_ip: string | null;
        };
        Returns: void;
      };
      admin_set_user_plan: {
        Args: {
          p_user: string;
          p_plan: string;
          p_total: number;
          p_reason: string;
          p_ip: string | null;
        };
        Returns: void;
      };
      admin_set_user_suspension: {
        Args: {
          p_user: string;
          p_suspended: boolean;
          p_reason: string;
          p_ip: string | null;
        };
        Returns: void;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type UsersClient = SupabaseClient<UsersDatabase, "public">;

/**
 * A session-scoped client typed for this feature. The cookie plumbing lives in
 * `lib/auth`, so the console has one session client rather than two that could
 * disagree about who is signed in.
 */
export async function createUsersClient(): Promise<UsersClient> {
  return (await createClient()) as unknown as UsersClient;
}
