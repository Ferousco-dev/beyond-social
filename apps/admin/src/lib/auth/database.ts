/**
 * The slice of the database this module is allowed to touch.
 *
 * The console does not ship the generated `database.types.ts`: auth needs
 * exactly two functions and one append-only table, and a narrow hand-written
 * type keeps the surface honest. Anything wider belongs to the feature modules
 * that own those tables.
 */
export type AdminAuditInsert = {
  actor_id: string | null;
  actor_email: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  summary?: string;
  before?: Json | null;
  after?: Json | null;
  ip?: string | null;
};

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type AuthDatabase = {
  public: {
    Tables: {
      admin_audit_log: {
        Row: AdminAuditInsert & { id: string; created_at: string };
        Insert: AdminAuditInsert;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_admin: {
        Args: Record<never, never>;
        Returns: boolean;
      };
      admin_log_action: {
        Args: {
          p_action: string;
          p_target_type: string;
          p_target_id?: string | null;
          p_summary?: string;
          p_before?: Json | null;
          p_after?: Json | null;
          p_ip?: string | null;
        };
        Returns: string;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
