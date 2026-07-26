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
      api_keys: {
        Row: {
          created_at: string;
          id: string;
          key_hash: string;
          key_prefix: string;
          last_used_at: string | null;
          name: string;
          org_id: string | null;
          revoked_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          key_hash: string;
          key_prefix: string;
          last_used_at?: string | null;
          name: string;
          org_id?: string | null;
          revoked_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          key_hash?: string;
          key_prefix?: string;
          last_used_at?: string | null;
          name?: string;
          org_id?: string | null;
          revoked_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_keys_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
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
      billing_customers: {
        Row: {
          created_at: string;
          stripe_customer_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          stripe_customer_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          stripe_customer_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      billing_events: {
        Row: {
          created_at: string;
          event_id: string;
          type: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          type: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          type?: string;
        };
        Relationships: [];
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
      embedding_cache: {
        Row: {
          created_at: string;
          embedding: number[];
          key: string;
          last_used_at: string;
          model: string;
        };
        Insert: {
          created_at?: string;
          embedding: number[];
          key: string;
          last_used_at?: string;
          model: string;
        };
        Update: {
          created_at?: string;
          embedding?: number[];
          key?: string;
          last_used_at?: string;
          model?: string;
        };
        Relationships: [];
      };
      feature_flags: {
        Row: {
          description: string;
          enabled: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          description?: string;
          enabled?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          description?: string;
          enabled?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          content: string;
          created_at: string;
          generation_id: string | null;
          id: string;
          project_id: string;
          role: Database["public"]["Enums"]["message_role"];
          user_id: string;
        };
        Insert: {
          content?: string;
          created_at?: string;
          generation_id?: string | null;
          id?: string;
          project_id: string;
          role: Database["public"]["Enums"]["message_role"];
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          generation_id?: string | null;
          id?: string;
          project_id?: string;
          role?: Database["public"]["Enums"]["message_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_generation_id_fkey";
            columns: ["generation_id"];
            isOneToOne: false;
            referencedRelation: "video_generations";
            referencedColumns: ["id"];
          },
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
      organization_members: {
        Row: {
          joined_at: string;
          org_id: string;
          role: Database["public"]["Enums"]["org_role"];
          user_id: string;
        };
        Insert: {
          joined_at?: string;
          org_id: string;
          role?: Database["public"]["Enums"]["org_role"];
          user_id: string;
        };
        Update: {
          joined_at?: string;
          org_id?: string;
          role?: Database["public"]["Enums"]["org_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
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
          org_id: string | null;
          pinned: boolean;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          org_id?: string | null;
          pinned?: boolean;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          org_id?: string | null;
          pinned?: boolean;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
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
      response_cache: {
        Row: {
          created_at: string;
          expires_at: string;
          input_tokens: number;
          key: string;
          model: string;
          output_tokens: number;
          response: string;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          input_tokens?: number;
          key: string;
          model: string;
          output_tokens?: number;
          response: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          input_tokens?: number;
          key?: string;
          model?: string;
          output_tokens?: number;
          response?: string;
        };
        Relationships: [];
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
      social_connections: {
        Row: {
          access_token: string;
          account_name: string;
          created_at: string;
          expires_at: string | null;
          external_account_id: string;
          id: string;
          platform: Database["public"]["Enums"]["social_platform"];
          refresh_token: string | null;
          revoked_at: string | null;
          scopes: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_token: string;
          account_name?: string;
          created_at?: string;
          expires_at?: string | null;
          external_account_id: string;
          id?: string;
          platform: Database["public"]["Enums"]["social_platform"];
          refresh_token?: string | null;
          revoked_at?: string | null;
          scopes?: string[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_token?: string;
          account_name?: string;
          created_at?: string;
          expires_at?: string | null;
          external_account_id?: string;
          id?: string;
          platform?: Database["public"]["Enums"]["social_platform"];
          refresh_token?: string | null;
          revoked_at?: string | null;
          scopes?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_connections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          current_period_end: string | null;
          id: string;
          plan: string;
          price_id: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          current_period_end?: string | null;
          id: string;
          plan: string;
          price_id: string;
          status: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancel_at_period_end?: boolean;
          current_period_end?: string | null;
          id?: string;
          plan?: string;
          price_id?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      trend_runs: {
        Row: {
          discovered: number;
          error: string | null;
          finished_at: string | null;
          id: number;
          ok: boolean;
          sources: number;
          started_at: string;
        };
        Insert: {
          discovered?: number;
          error?: string | null;
          finished_at?: string | null;
          id?: number;
          ok?: boolean;
          sources?: number;
          started_at?: string;
        };
        Update: {
          discovered?: number;
          error?: string | null;
          finished_at?: string | null;
          id?: number;
          ok?: boolean;
          sources?: number;
          started_at?: string;
        };
        Relationships: [];
      };
      trends: {
        Row: {
          category: string;
          confidence: number;
          description: string;
          discovered_at: string;
          expires_at: string;
          id: string;
          platform: Database["public"]["Enums"]["social_platform"] | null;
          prompt: string;
          source_name: string;
          source_url: string;
          title: string;
        };
        Insert: {
          category: string;
          confidence?: number;
          description?: string;
          discovered_at?: string;
          expires_at?: string;
          id?: string;
          platform?: Database["public"]["Enums"]["social_platform"] | null;
          prompt: string;
          source_name?: string;
          source_url: string;
          title: string;
        };
        Update: {
          category?: string;
          confidence?: number;
          description?: string;
          discovered_at?: string;
          expires_at?: string;
          id?: string;
          platform?: Database["public"]["Enums"]["social_platform"] | null;
          prompt?: string;
          source_name?: string;
          source_url?: string;
          title?: string;
        };
        Relationships: [];
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
      social_connections_public: {
        Row: {
          account_name: string | null;
          active: boolean | null;
          created_at: string | null;
          expires_at: string | null;
          external_account_id: string | null;
          id: string | null;
          platform: Database["public"]["Enums"]["social_platform"] | null;
          revoked_at: string | null;
        };
        Insert: {
          account_name?: string | null;
          active?: never;
          created_at?: string | null;
          expires_at?: string | null;
          external_account_id?: string | null;
          id?: string | null;
          platform?: Database["public"]["Enums"]["social_platform"] | null;
          revoked_at?: string | null;
        };
        Update: {
          account_name?: string | null;
          active?: never;
          created_at?: string | null;
          expires_at?: string | null;
          external_account_id?: string | null;
          id?: string | null;
          platform?: Database["public"]["Enums"]["social_platform"] | null;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      admin_pending_candidates: {
        Args: { p_limit?: number };
        Returns: {
          created_at: string;
          data: Json;
          id: string;
        }[];
      };
      admin_platform_stats: {
        Args: { p_since: string };
        Returns: {
          ai_calls: number;
          ai_cost: number;
          ai_failures: number;
          cached_calls: number;
          failed_generations: number;
          generations: number;
          orgs: number;
          users: number;
        }[];
      };
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
      api_key_owner: { Args: { p_hash: string }; Returns: string };
      append_turn: {
        Args: {
          p_assistant_content: string;
          p_generation?: string;
          p_project: string;
          p_user_content: string;
        };
        Returns: {
          content: string;
          created_at: string;
          generation_id: string | null;
          id: string;
          project_id: string;
          role: Database["public"]["Enums"]["message_role"];
          user_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "messages";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      billing_apply_subscription: {
        Args: {
          p_cancel_at_period_end: boolean;
          p_credits: number;
          p_event_id: string;
          p_event_type: string;
          p_period_end: string;
          p_plan: string;
          p_price_id: string;
          p_status: string;
          p_subscription_id: string;
          p_user: string;
        };
        Returns: boolean;
      };
      billing_link_customer: {
        Args: { p_customer: string; p_user: string };
        Returns: undefined;
      };
      cache_prune: {
        Args: { p_max_embeddings?: number };
        Returns: {
          embeddings_removed: number;
          responses_removed: number;
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
      create_organization: {
        Args: { p_name: string; p_slug: string };
        Returns: string;
      };
      embedding_cache_get: { Args: { p_key: string }; Returns: number[] };
      embedding_cache_put: {
        Args: { p_embedding: number[]; p_key: string; p_model: string };
        Returns: undefined;
      };
      fail_generation: {
        Args: { p_error: string; p_provider_task_id: string };
        Returns: undefined;
      };
      is_admin: { Args: never; Returns: boolean };
      is_org_member: {
        Args: {
          p_min_role?: Database["public"]["Enums"]["org_role"];
          p_org: string;
        };
        Returns: boolean;
      };
      product_activity_daily: {
        Args: { p_days?: number; p_user: string };
        Returns: {
          day: string;
          generated: number;
          ready: number;
        }[];
      };
      product_funnel: {
        Args: { p_since: string; p_user: string };
        Returns: {
          generated: number;
          published: number;
          ready: number;
        }[];
      };
      product_platform_totals: {
        Args: { p_user: string };
        Returns: {
          platform: string;
          published: number;
        }[];
      };
      project_thread: {
        Args: { p_project: string };
        Returns: {
          content: string;
          created_at: string;
          generation_id: string;
          generation_status: Database["public"]["Enums"]["generation_status"];
          id: string;
          result_url: string;
          role: Database["public"]["Enums"]["message_role"];
        }[];
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
      response_cache_get: { Args: { p_key: string }; Returns: string };
      response_cache_put: {
        Args: {
          p_input_tokens?: number;
          p_key: string;
          p_model: string;
          p_output_tokens?: number;
          p_response: string;
          p_ttl_seconds: number;
        };
        Returns: undefined;
      };
      set_member_role: {
        Args: {
          p_org: string;
          p_role: Database["public"]["Enums"]["org_role"];
          p_user: string;
        };
        Returns: undefined;
      };
      social_connection_revoke: {
        Args: { p_platform: Database["public"]["Enums"]["social_platform"] };
        Returns: undefined;
      };
      trends_current: {
        Args: { p_category?: string; p_limit?: number };
        Returns: {
          category: string;
          confidence: number;
          description: string;
          discovered_at: string;
          expires_at: string;
          id: string;
          platform: Database["public"]["Enums"]["social_platform"] | null;
          prompt: string;
          source_name: string;
          source_url: string;
          title: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "trends";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      asset_kind: "photo" | "video" | "audio";
      generation_status: "queued" | "generating" | "ready" | "failed";
      message_role: "user" | "assistant";
      org_role: "owner" | "admin" | "member";
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
      org_role: ["owner", "admin", "member"],
      post_status: ["scheduled", "publishing", "published", "failed"],
      social_platform: ["tiktok", "instagram", "facebook", "youtube"],
      user_role: ["user", "admin"],
    },
  },
} as const;
