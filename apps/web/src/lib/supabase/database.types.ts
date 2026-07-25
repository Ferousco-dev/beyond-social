export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      ai_usage: {
        Row: {
          attempts: number;
          cached: boolean;
          cost_usd: number;
          created_at: string;
          error: string | null;
          fallbacks: number;
          id: number;
          input_tokens: number;
          latency_ms: number;
          model: string;
          ok: boolean;
          output_tokens: number;
          provider: string;
          request_id: string;
          task: string;
          user_id: string | null;
        };
        Insert: {
          attempts?: number;
          cached?: boolean;
          cost_usd?: number;
          created_at?: string;
          error?: string | null;
          fallbacks?: number;
          id?: number;
          input_tokens?: number;
          latency_ms?: number;
          model: string;
          ok?: boolean;
          output_tokens?: number;
          provider: string;
          request_id: string;
          task: string;
          user_id?: string | null;
        };
        Update: {
          attempts?: number;
          cached?: boolean;
          cost_usd?: number;
          created_at?: string;
          error?: string | null;
          fallbacks?: number;
          id?: number;
          input_tokens?: number;
          latency_ms?: number;
          model?: string;
          ok?: boolean;
          output_tokens?: number;
          provider?: string;
          request_id?: string;
          task?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      assets: {
        Row: {
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["asset_kind"];
          project_id: string | null;
          storage_path: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["asset_kind"];
          project_id?: string | null;
          storage_path: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["asset_kind"];
          project_id?: string | null;
          storage_path?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      credit_ledger: {
        Row: {
          created_at: string;
          delta: number;
          generation_id: string | null;
          id: string;
          reason: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          delta: number;
          generation_id?: string | null;
          id?: string;
          reason: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          delta?: number;
          generation_id?: string | null;
          id?: string;
          reason?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_ledger_generation_id_fkey";
            columns: ["generation_id"];
            isOneToOne: false;
            referencedRelation: "video_generations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credit_ledger_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          project_id: string;
          role: Database["public"]["Enums"]["message_role"];
          user_id: string;
        };
        Insert: {
          content?: string;
          created_at?: string;
          id?: string;
          project_id: string;
          role: Database["public"]["Enums"]["message_role"];
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          project_id?: string;
          role?: Database["public"]["Enums"]["message_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          credits_period_start: string;
          credits_total: number;
          credits_used: number;
          email: string;
          full_name: string | null;
          id: string;
          plan: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          credits_period_start?: string;
          credits_total?: number;
          credits_used?: number;
          email: string;
          full_name?: string | null;
          id: string;
          plan?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          credits_period_start?: string;
          credits_total?: number;
          credits_used?: number;
          email?: string;
          full_name?: string | null;
          id?: string;
          plan?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          created_at: string;
          id: string;
          pinned: boolean;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          pinned?: boolean;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          pinned?: boolean;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      prompt_audit_log: {
        Row: {
          action: string;
          candidate_id: string | null;
          chunk_id: string | null;
          created_at: string;
          data: Json;
          id: string;
          workspace_id: string | null;
        };
        Insert: {
          action: string;
          candidate_id?: string | null;
          chunk_id?: string | null;
          created_at?: string;
          data: Json;
          id: string;
          workspace_id?: string | null;
        };
        Update: {
          action?: string;
          candidate_id?: string | null;
          chunk_id?: string | null;
          created_at?: string;
          data?: Json;
          id?: string;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      prompt_candidates: {
        Row: {
          created_at: string;
          data: Json;
          id: string;
          status: string;
          updated_at: string;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string;
          data: Json;
          id: string;
          status?: string;
          updated_at?: string;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string;
          data?: Json;
          id?: string;
          status?: string;
          updated_at?: string;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      prompt_chunk_versions: {
        Row: {
          chunk_id: string;
          created_at: string;
          data: Json;
          reason: string;
          version: number;
        };
        Insert: {
          chunk_id: string;
          created_at?: string;
          data: Json;
          reason: string;
          version: number;
        };
        Update: {
          chunk_id?: string;
          created_at?: string;
          data?: Json;
          reason?: string;
          version?: number;
        };
        Relationships: [];
      };
      prompt_chunks: {
        Row: {
          body_tsv: unknown;
          category: string;
          content_hash: string;
          data: Json;
          embedding: string;
          id: string;
          platforms: string[];
          product_types: string[];
          status: string;
          updated_at: string;
        };
        Insert: {
          body_tsv?: unknown;
          category: string;
          content_hash: string;
          data: Json;
          embedding: string;
          id: string;
          platforms?: string[];
          product_types?: string[];
          status?: string;
          updated_at?: string;
        };
        Update: {
          body_tsv?: unknown;
          category?: string;
          content_hash?: string;
          data?: Json;
          embedding?: string;
          id?: string;
          platforms?: string[];
          product_types?: string[];
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      prompt_experiments: {
        Row: {
          created_at: string;
          id: string;
          metrics: Json;
          name: string;
          status: string;
          updated_at: string;
          variants: Json;
        };
        Insert: {
          created_at?: string;
          id: string;
          metrics?: Json;
          name: string;
          status?: string;
          updated_at?: string;
          variants?: Json;
        };
        Update: {
          created_at?: string;
          id?: string;
          metrics?: Json;
          name?: string;
          status?: string;
          updated_at?: string;
          variants?: Json;
        };
        Relationships: [];
      };
      prompt_scores: {
        Row: {
          chunk_id: string;
          data: Json;
          quality_score: number;
          updated_at: string;
        };
        Insert: {
          chunk_id: string;
          data: Json;
          quality_score?: number;
          updated_at?: string;
        };
        Update: {
          chunk_id?: string;
          data?: Json;
          quality_score?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prompt_scores_chunk_id_fkey";
            columns: ["chunk_id"];
            isOneToOne: true;
            referencedRelation: "prompt_chunks";
            referencedColumns: ["id"];
          },
        ];
      };
      scheduled_posts: {
        Row: {
          caption: string;
          created_at: string;
          error: string | null;
          external_id: string | null;
          generation_id: string | null;
          hashtags: string;
          id: string;
          platform: Database["public"]["Enums"]["social_platform"];
          scheduled_for: string;
          status: Database["public"]["Enums"]["post_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          caption?: string;
          created_at?: string;
          error?: string | null;
          external_id?: string | null;
          generation_id?: string | null;
          hashtags?: string;
          id?: string;
          platform: Database["public"]["Enums"]["social_platform"];
          scheduled_for: string;
          status?: Database["public"]["Enums"]["post_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          caption?: string;
          created_at?: string;
          error?: string | null;
          external_id?: string | null;
          generation_id?: string | null;
          hashtags?: string;
          id?: string;
          platform?: Database["public"]["Enums"]["social_platform"];
          scheduled_for?: string;
          status?: Database["public"]["Enums"]["post_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_generation_id_fkey";
            columns: ["generation_id"];
            isOneToOne: false;
            referencedRelation: "video_generations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scheduled_posts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      video_generations: {
        Row: {
          aspect_ratio: string;
          created_at: string;
          duration: number;
          error: string | null;
          id: string;
          image_urls: string[];
          model: string;
          project_id: string;
          prompt: string;
          provider: string;
          provider_task_id: string | null;
          resolution: string;
          result_url: string | null;
          status: Database["public"]["Enums"]["generation_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          aspect_ratio?: string;
          created_at?: string;
          duration?: number;
          error?: string | null;
          id?: string;
          image_urls?: string[];
          model?: string;
          project_id: string;
          prompt: string;
          provider?: string;
          provider_task_id?: string | null;
          resolution?: string;
          result_url?: string | null;
          status?: Database["public"]["Enums"]["generation_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          aspect_ratio?: string;
          created_at?: string;
          duration?: number;
          error?: string | null;
          id?: string;
          image_urls?: string[];
          model?: string;
          project_id?: string;
          prompt?: string;
          provider?: string;
          provider_task_id?: string | null;
          resolution?: string;
          result_url?: string | null;
          status?: Database["public"]["Enums"]["generation_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "video_generations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_generations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      ai_usage_record: { Args: { p_usage: Json }; Returns: undefined };
      ai_usage_summary: {
        Args: { p_since: string; p_user: string };
        Returns: {
          cached_calls: number;
          calls: number;
          cost_usd: number;
          failed_calls: number;
          input_tokens: number;
          output_tokens: number;
          p50_latency_ms: number;
        }[];
      };
      claim_due_posts: {
        Args: { p_limit?: number };
        Returns: {
          caption: string;
          created_at: string;
          error: string | null;
          external_id: string | null;
          generation_id: string | null;
          hashtags: string;
          id: string;
          platform: Database["public"]["Enums"]["social_platform"];
          scheduled_for: string;
          status: Database["public"]["Enums"]["post_status"];
          updated_at: string;
          user_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "scheduled_posts";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      complete_generation: {
        Args: { p_provider_task_id: string; p_result_url: string };
        Returns: undefined;
      };
      fail_generation: {
        Args: { p_error: string; p_provider_task_id: string };
        Returns: undefined;
      };
      prompt_apply_scores: { Args: { p_scores: Json }; Returns: undefined };
      prompt_deprecate: { Args: { p_ids: string[] }; Returns: undefined };
      prompt_get_candidate: {
        Args: { p_id: string };
        Returns: {
          data: Json;
        }[];
      };
      prompt_get_scores: {
        Args: { p_ids: string[] };
        Returns: {
          data: Json;
        }[];
      };
      prompt_list_candidates: {
        Args: { p_status: string; p_workspace: string };
        Returns: {
          data: Json;
        }[];
      };
      prompt_log_audit: { Args: { p_entry: Json }; Returns: undefined };
      prompt_record_candidate: {
        Args: { p_candidate: Json };
        Returns: undefined;
      };
      prompt_save_version: {
        Args: { p_chunk: Json; p_reason: string };
        Returns: undefined;
      };
      prompt_search: {
        Args: {
          p_categories: string[];
          p_embedding: Json;
          p_limit: number;
          p_min_similarity: number;
          p_platforms: string[];
          p_product_types: string[];
          p_query: string;
          p_status: string[];
        };
        Returns: {
          chunk: Json;
          lexical_rank: number;
          score: Json;
          similarity: number;
        }[];
      };
      prompt_set_candidate_status: {
        Args: { p_id: string; p_status: string };
        Returns: undefined;
      };
      prompt_upsert_chunk: {
        Args: { p_chunk: Json; p_embedding: Json };
        Returns: undefined;
      };
      reset_due_credits: { Args: never; Returns: undefined };
    };
    Enums: {
      asset_kind: "photo" | "video" | "audio";
      generation_status: "queued" | "generating" | "ready" | "failed";
      message_role: "user" | "assistant";
      post_status: "scheduled" | "publishing" | "published" | "failed";
      social_platform: "tiktok" | "instagram" | "facebook" | "youtube";
      user_role: "user" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      asset_kind: ["photo", "video", "audio"],
      generation_status: ["queued", "generating", "ready", "failed"],
      message_role: ["user", "assistant"],
      post_status: ["scheduled", "publishing", "published", "failed"],
      social_platform: ["tiktok", "instagram", "facebook", "youtube"],
      user_role: ["user", "admin"],
    },
  },
} as const;
