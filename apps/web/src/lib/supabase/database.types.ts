export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string;
          actor_email: string;
          actor_id: string | null;
          after: Json | null;
          before: Json | null;
          created_at: string;
          id: string;
          ip: unknown;
          summary: string;
          target_id: string | null;
          target_type: string;
        };
        Insert: {
          action: string;
          actor_email: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          id?: string;
          ip?: unknown;
          summary?: string;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_email?: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          id?: string;
          ip?: unknown;
          summary?: string;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [];
      };
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
      ai_usage_daily: {
        Row: {
          cached_calls: number;
          calls: number;
          cost_usd: number;
          day: string;
          failed_calls: number;
          input_tokens: number;
          model: string;
          output_tokens: number;
          provider: string;
          user_id: string;
        };
        Insert: {
          cached_calls?: number;
          calls?: number;
          cost_usd?: number;
          day: string;
          failed_calls?: number;
          input_tokens?: number;
          model: string;
          output_tokens?: number;
          provider: string;
          user_id: string;
        };
        Update: {
          cached_calls?: number;
          calls?: number;
          cost_usd?: number;
          day?: string;
          failed_calls?: number;
          input_tokens?: number;
          model?: string;
          output_tokens?: number;
          provider?: string;
          user_id?: string;
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
      app_config: {
        Row: {
          area: string;
          description: string;
          key: string;
          takes_effect: string;
          updated_at: string;
          updated_by: string | null;
          updated_by_email: string | null;
          value: Json;
          value_type: string;
        };
        Insert: {
          area: string;
          description: string;
          key: string;
          takes_effect?: string;
          updated_at?: string;
          updated_by?: string | null;
          updated_by_email?: string | null;
          value: Json;
          value_type: string;
        };
        Update: {
          area?: string;
          description?: string;
          key?: string;
          takes_effect?: string;
          updated_at?: string;
          updated_by?: string | null;
          updated_by_email?: string | null;
          value?: Json;
          value_type?: string;
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
            referencedRelation: "deleted_accounts_grace";
            referencedColumns: ["user_id"];
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
      conversation_summaries: {
        Row: {
          covered_through: string;
          message_count: number;
          project_id: string;
          summary: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          covered_through: string;
          message_count?: number;
          project_id: string;
          summary: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          covered_through?: string;
          message_count?: number;
          project_id?: string;
          summary?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      credit_ledger: {
        Row: {
          created_at: string;
          delta: number;
          external_ref: string | null;
          generation_id: string | null;
          id: string;
          kind: string;
          reason: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          delta: number;
          external_ref?: string | null;
          generation_id?: string | null;
          id?: string;
          kind?: string;
          reason: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          delta?: number;
          external_ref?: string | null;
          generation_id?: string | null;
          id?: string;
          kind?: string;
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
            referencedRelation: "deleted_accounts_grace";
            referencedColumns: ["user_id"];
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
      editor_documents: {
        Row: {
          document: Json;
          project_id: string;
          revision: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          document: Json;
          project_id: string;
          revision?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          document?: Json;
          project_id?: string;
          revision?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "editor_documents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "editor_documents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "deleted_accounts_grace";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "editor_documents_user_id_fkey";
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
      likeness_consents: {
        Row: {
          accepted_at: string;
          id: string;
          statement_version: number;
          user_id: string;
        };
        Insert: {
          accepted_at?: string;
          id?: string;
          statement_version: number;
          user_id: string;
        };
        Update: {
          accepted_at?: string;
          id?: string;
          statement_version?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      mail_deliveries: {
        Row: {
          attempts: number;
          created_at: string;
          error: string | null;
          id: string;
          payload: Json;
          provider_message_id: string | null;
          send_started_at: string | null;
          sent_at: string | null;
          status: string;
          template_key: string;
          to_email: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          error?: string | null;
          id?: string;
          payload?: Json;
          provider_message_id?: string | null;
          send_started_at?: string | null;
          sent_at?: string | null;
          status?: string;
          template_key: string;
          to_email: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          error?: string | null;
          id?: string;
          payload?: Json;
          provider_message_id?: string | null;
          send_started_at?: string | null;
          sent_at?: string | null;
          status?: string;
          template_key?: string;
          to_email?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mail_deliveries_template_key_fkey";
            columns: ["template_key"];
            isOneToOne: false;
            referencedRelation: "mail_templates";
            referencedColumns: ["key"];
          },
        ];
      };
      mail_templates: {
        Row: {
          body: string;
          key: string;
          subject: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          key: string;
          subject: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          key?: string;
          subject?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      managed_secrets: {
        Row: {
          created_at: string;
          description: string;
          expected_by: string;
          is_set: boolean;
          key: string;
          last_four: string | null;
          location: string;
          rotated_at: string | null;
          rotated_by: string | null;
          rotated_by_email: string | null;
          updated_at: string;
          vault_secret_id: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string;
          expected_by: string;
          is_set?: boolean;
          key: string;
          last_four?: string | null;
          location: string;
          rotated_at?: string | null;
          rotated_by?: string | null;
          rotated_by_email?: string | null;
          updated_at?: string;
          vault_secret_id?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string;
          expected_by?: string;
          is_set?: boolean;
          key?: string;
          last_four?: string | null;
          location?: string;
          rotated_at?: string | null;
          rotated_by?: string | null;
          rotated_by_email?: string | null;
          updated_at?: string;
          vault_secret_id?: string | null;
        };
        Relationships: [];
      };
      message_attachments: {
        Row: {
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["asset_kind"];
          message_id: string;
          sort_order: number;
          storage_path: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["asset_kind"];
          message_id: string;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["asset_kind"];
          message_id?: string;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      message_embeddings: {
        Row: {
          created_at: string;
          embedding: string;
          message_id: string;
          project_id: string;
          snippet: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          embedding: string;
          message_id: string;
          project_id: string;
          snippet: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          embedding?: string;
          message_id?: string;
          project_id?: string;
          snippet?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_embeddings_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: true;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_embeddings_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
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
            referencedRelation: "deleted_accounts_grace";
            referencedColumns: ["user_id"];
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
      model_catalog: {
        Row: {
          capabilities: string[];
          created_at: string;
          credit_cost: number;
          description: string;
          family: string;
          id: string;
          is_active: boolean;
          min_plan: string;
          name: string;
          provider: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          capabilities?: string[];
          created_at?: string;
          credit_cost: number;
          description: string;
          family: string;
          id: string;
          is_active?: boolean;
          min_plan?: string;
          name: string;
          provider: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          capabilities?: string[];
          created_at?: string;
          credit_cost?: number;
          description?: string;
          family?: string;
          id?: string;
          is_active?: boolean;
          min_plan?: string;
          name?: string;
          provider?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
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
          deleted_at: string | null;
          deleted_by: string | null;
          deletion_reason: string | null;
          email: string;
          full_name: string | null;
          id: string;
          plan: string;
          role: Database["public"]["Enums"]["user_role"];
          suspended_at: string | null;
          suspended_by: string | null;
          suspended_reason: string | null;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          credits_period_start?: string;
          credits_total?: number;
          credits_used?: number;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deletion_reason?: string | null;
          email: string;
          full_name?: string | null;
          id: string;
          plan?: string;
          role?: Database["public"]["Enums"]["user_role"];
          suspended_at?: string | null;
          suspended_by?: string | null;
          suspended_reason?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          credits_period_start?: string;
          credits_total?: number;
          credits_used?: number;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deletion_reason?: string | null;
          email?: string;
          full_name?: string | null;
          id?: string;
          plan?: string;
          role?: Database["public"]["Enums"]["user_role"];
          suspended_at?: string | null;
          suspended_by?: string | null;
          suspended_reason?: string | null;
          timezone?: string;
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
            referencedRelation: "deleted_accounts_grace";
            referencedColumns: ["user_id"];
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
      rate_limits: {
        Row: {
          count: number;
          key: string;
          window_end: string;
        };
        Insert: {
          count?: number;
          key: string;
          window_end: string;
        };
        Update: {
          count?: number;
          key?: string;
          window_end?: string;
        };
        Relationships: [];
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
          idempotency_key: string | null;
          platform: Database["public"]["Enums"]["social_platform"];
          publish_started_at: string | null;
          scheduled_for: string;
          status: Database["public"]["Enums"]["post_status"];
          trace_id: string | null;
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
          idempotency_key?: string | null;
          platform: Database["public"]["Enums"]["social_platform"];
          publish_started_at?: string | null;
          scheduled_for: string;
          status?: Database["public"]["Enums"]["post_status"];
          trace_id?: string | null;
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
          idempotency_key?: string | null;
          platform?: Database["public"]["Enums"]["social_platform"];
          publish_started_at?: string | null;
          scheduled_for?: string;
          status?: Database["public"]["Enums"]["post_status"];
          trace_id?: string | null;
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
            referencedRelation: "deleted_accounts_grace";
            referencedColumns: ["user_id"];
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
            referencedRelation: "deleted_accounts_grace";
            referencedColumns: ["user_id"];
          },
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
      user_memories: {
        Row: {
          created_at: string;
          embedding: string | null;
          fact: string;
          fact_hash: string;
          id: string;
          importance: number;
          kind: string;
          last_used_at: string | null;
          source_project: string | null;
          use_count: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          embedding?: string | null;
          fact: string;
          fact_hash: string;
          id?: string;
          importance?: number;
          kind?: string;
          last_used_at?: string | null;
          source_project?: string | null;
          use_count?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          embedding?: string | null;
          fact?: string;
          fact_hash?: string;
          id?: string;
          importance?: number;
          kind?: string;
          last_used_at?: string | null;
          source_project?: string | null;
          use_count?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_memories_source_project_fkey";
            columns: ["source_project"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      user_model_preferences: {
        Row: {
          family: string;
          model_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          family: string;
          model_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          family?: string;
          model_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_model_preferences_model_family_fkey";
            columns: ["model_id", "family"];
            isOneToOne: false;
            referencedRelation: "model_catalog";
            referencedColumns: ["id", "family"];
          },
          {
            foreignKeyName: "user_model_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "deleted_accounts_grace";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "user_model_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_webhooks: {
        Row: {
          created_at: string;
          events: string[];
          failure_count: number;
          id: string;
          is_active: boolean;
          last_delivery_at: string | null;
          secret_hash: string;
          secret_last_four: string;
          url: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          events: string[];
          failure_count?: number;
          id?: string;
          is_active?: boolean;
          last_delivery_at?: string | null;
          secret_hash: string;
          secret_last_four: string;
          url: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          events?: string[];
          failure_count?: number;
          id?: string;
          is_active?: boolean;
          last_delivery_at?: string | null;
          secret_hash?: string;
          secret_last_four?: string;
          url?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_webhooks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "deleted_accounts_grace";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "user_webhooks_user_id_fkey";
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
          trace_id: string | null;
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
          trace_id?: string | null;
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
          trace_id?: string | null;
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
            referencedRelation: "deleted_accounts_grace";
            referencedColumns: ["user_id"];
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
      voice_profiles: {
        Row: {
          consent_version: number;
          created_at: string;
          id: string;
          phrase: string;
          provider_voice_id: string | null;
          storage_path: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          consent_version: number;
          created_at?: string;
          id?: string;
          phrase: string;
          provider_voice_id?: string | null;
          storage_path: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          consent_version?: number;
          created_at?: string;
          id?: string;
          phrase?: string;
          provider_voice_id?: string | null;
          storage_path?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      deleted_accounts_grace: {
        Row: {
          days_remaining: number | null;
          deleted_at: string | null;
          deleted_by: string | null;
          deletion_reason: string | null;
          email: string | null;
          erasable_at: string | null;
          full_name: string | null;
          past_grace_period: boolean | null;
          user_id: string | null;
        };
        Insert: {
          days_remaining?: never;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deletion_reason?: string | null;
          email?: string | null;
          erasable_at?: never;
          full_name?: string | null;
          past_grace_period?: never;
          user_id?: string | null;
        };
        Update: {
          days_remaining?: never;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deletion_reason?: string | null;
          email?: string | null;
          erasable_at?: never;
          full_name?: string | null;
          past_grace_period?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
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
      account_deletion_grace: { Args: never; Returns: string };
      admin_active_users_daily: {
        Args: { p_days?: number };
        Returns: {
          dau: number;
          day: string;
          mau: number;
        }[];
      };
      admin_ai_failures: {
        Args: { p_limit?: number; p_since: string };
        Returns: {
          calls: number;
          failures: number;
          observed_at: string;
          providers: Json;
        }[];
      };
      admin_ai_spend_by_model: {
        Args: { p_days?: number };
        Returns: {
          calls: number;
          cost_usd: number;
          failed_calls: number;
          input_tokens: number;
          model: string;
          output_tokens: number;
          provider: string;
        }[];
      };
      admin_ai_spend_daily: {
        Args: { p_days?: number };
        Returns: {
          cached_calls: number;
          calls: number;
          cost_usd: number;
          day: string;
          failed_calls: number;
        }[];
      };
      admin_app_config_all: {
        Args: never;
        Returns: {
          area: string;
          description: string;
          key: string;
          takes_effect: string;
          updated_at: string;
          updated_by_email: string;
          value: Json;
          value_type: string;
        }[];
      };
      admin_cache_health: {
        Args: { p_since: string };
        Returns: {
          ai_calls: number;
          cached_calls: number;
          embedding_entries: number;
          expired_entries: number;
          live_entries: number;
          newest_entry_at: string;
          observed_at: string;
        }[];
      };
      admin_deleted_accounts: {
        Args: never;
        Returns: {
          days_remaining: number;
          deleted_at: string;
          deleted_by_email: string;
          deletion_reason: string;
          email: string;
          erasable_at: string;
          full_name: string;
          past_grace_period: boolean;
          user_id: string;
        }[];
      };
      admin_failure_details: {
        Args: {
          p_kind?: string;
          p_limit?: number;
          p_since: string;
          p_until: string;
        };
        Returns: {
          items: Json;
          matched: number;
          observed_at: string;
        }[];
      };
      admin_failure_feed: {
        Args: { p_limit?: number; p_since: string };
        Returns: {
          failed_generations: number;
          failed_posts: number;
          items: Json;
          observed_at: string;
        }[];
      };
      admin_generations_daily: {
        Args: { p_days?: number };
        Returns: {
          day: string;
          failed: number;
          pending: number;
          succeeded: number;
          total: number;
        }[];
      };
      admin_log_action: {
        Args: {
          p_action: string;
          p_after?: Json;
          p_before?: Json;
          p_ip?: unknown;
          p_summary?: string;
          p_target_id?: string;
          p_target_type: string;
        };
        Returns: string;
      };
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
      admin_rate_limit_pressure: {
        Args: { p_limit?: number };
        Returns: {
          active_keys: number;
          observed_at: string;
          scopes: Json;
        }[];
      };
      admin_restore_account: {
        Args: { p_user: string };
        Returns: {
          deleted_at: string;
          email: string;
          id: string;
        }[];
      };
      admin_retry_post: {
        Args: { p_ip?: unknown; p_post: string; p_reason?: string };
        Returns: {
          id: string;
          may_have_posted: boolean;
          requeued_at: string;
        }[];
      };
      admin_search_users: {
        Args: {
          p_cursor_created_at?: string;
          p_cursor_id?: string;
          p_limit?: number;
          p_query?: string;
        };
        Returns: {
          created_at: string;
          credits_total: number;
          credits_used: number;
          email: string;
          full_name: string;
          id: string;
          plan: string;
          role: string;
          suspended_at: string;
        }[];
      };
      admin_secret_clear: {
        Args: { p_ip?: unknown; p_key: string };
        Returns: undefined;
      };
      admin_secret_rotate: {
        Args: {
          p_ip?: unknown;
          p_key: string;
          p_store_value?: boolean;
          p_value: string;
        };
        Returns: undefined;
      };
      admin_secrets_list: {
        Args: never;
        Returns: {
          description: string;
          expected_by: string;
          has_stored_value: boolean;
          is_set: boolean;
          key: string;
          last_four: string;
          location: string;
          rotated_at: string;
          rotated_by_email: string;
        }[];
      };
      admin_set_app_config: {
        Args: { p_ip?: unknown; p_key: string; p_value: Json };
        Returns: {
          area: string;
          description: string;
          key: string;
          takes_effect: string;
          updated_at: string;
          updated_by_email: string;
          value: Json;
          value_type: string;
        }[];
      };
      admin_set_user_credits: {
        Args: {
          p_ip?: unknown;
          p_reason: string;
          p_total: number;
          p_used: number;
          p_user: string;
        };
        Returns: undefined;
      };
      admin_set_user_plan: {
        Args: {
          p_ip?: unknown;
          p_plan: string;
          p_reason: string;
          p_total: number;
          p_user: string;
        };
        Returns: undefined;
      };
      admin_set_user_suspension: {
        Args: {
          p_ip?: unknown;
          p_reason: string;
          p_suspended: boolean;
          p_user: string;
        };
        Returns: undefined;
      };
      admin_signups_daily: {
        Args: { p_days?: number };
        Returns: {
          day: string;
          signups: number;
        }[];
      };
      admin_stuck_pipeline: {
        Args: {
          p_generating_stale?: string;
          p_limit?: number;
          p_publishing_stale?: string;
        };
        Returns: {
          generating_stuck: number;
          items: Json;
          observed_at: string;
          publishing_stuck: number;
        }[];
      };
      admin_stuck_work: {
        Args: {
          p_generating_stale?: string;
          p_limit?: number;
          p_publishing_stale?: string;
        };
        Returns: {
          generating_stuck: number;
          items: Json;
          observed_at: string;
          publish_incomplete: number;
        }[];
      };
      admin_subscriptions_by_plan: {
        Args: never;
        Returns: {
          plan: string;
          subscriptions: number;
          trialing: number;
        }[];
      };
      admin_trace_timeline: {
        Args: { p_trace_id: string };
        Returns: {
          items: Json;
          observed_at: string;
          records: number;
        }[];
      };
      admin_user_detail: {
        Args: { p_user: string };
        Returns: {
          created_at: string;
          credits_period_start: string;
          credits_total: number;
          credits_used: number;
          email: string;
          full_name: string;
          generation_count: number;
          id: string;
          last_active_at: string;
          message_count: number;
          plan: string;
          project_count: number;
          role: string;
          subscription_cancel_at_period_end: boolean;
          subscription_period_end: string;
          subscription_plan: string;
          subscription_status: string;
          suspended_at: string;
          suspended_by_email: string;
          suspended_reason: string;
        }[];
      };
      admin_user_snapshot: { Args: { p_user: string }; Returns: Json };
      admin_user_totals: {
        Args: never;
        Returns: {
          active_subscriptions: number;
          total_users: number;
        }[];
      };
      admin_window_days: {
        Args: { p_days: number };
        Returns: {
          day: string;
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
      app_config_value_matches: {
        Args: { p_type: string; p_value: Json };
        Returns: boolean;
      };
      append_turn: {
        Args: {
          p_assistant_content: string;
          p_attachments?: Json;
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
      block_delivery: {
        Args: { p_delivery: string; p_error: string };
        Returns: undefined;
      };
      cache_prune: {
        Args: { p_max_embeddings?: number };
        Returns: {
          embeddings_removed: number;
          responses_removed: number;
        }[];
      };
      can_run_model: {
        Args: { p_model: string };
        Returns: {
          allowed: boolean;
          balance: number;
          credit_cost: number;
          reason: string;
        }[];
      };
      cancel_generation: {
        Args: { p_generation_id: string; p_user_id: string };
        Returns: undefined;
      };
      claim_delivery_for_send: {
        Args: { p_delivery: string };
        Returns: {
          attempts: number;
          id: string;
          payload: Json;
          template_key: string;
          to_email: string;
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
          idempotency_key: string | null;
          platform: Database["public"]["Enums"]["social_platform"];
          publish_started_at: string | null;
          scheduled_for: string;
          status: Database["public"]["Enums"]["post_status"];
          trace_id: string | null;
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
      claim_post_for_publish: {
        Args: { p_post: string };
        Returns: {
          caption: string;
          generation_id: string;
          hashtags: string;
          id: string;
          platform: string;
          trace_id: string;
          user_id: string;
        }[];
      };
      complete_generation: {
        Args: { p_provider_task_id: string; p_result_url: string };
        Returns: undefined;
      };
      create_organization: {
        Args: { p_name: string; p_slug: string };
        Returns: string;
      };
      credit_balance: { Args: never; Returns: number };
      editor_document_save: {
        Args: {
          p_document: Json;
          p_expected_revision?: number;
          p_project: string;
        };
        Returns: number;
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
      grant_credits: {
        Args: {
          p_amount: number;
          p_external_ref?: string;
          p_reason: string;
          p_user: string;
        };
        Returns: number;
      };
      is_account_deleted: { Args: never; Returns: boolean };
      is_admin: { Args: never; Returns: boolean };
      is_org_member: {
        Args: {
          p_min_role?: Database["public"]["Enums"]["org_role"];
          p_org: string;
        };
        Returns: boolean;
      };
      is_suspended: { Args: never; Returns: boolean };
      match_conversations: {
        Args: {
          p_embedding: string;
          p_exclude?: string;
          p_limit?: number;
          p_min_similarity?: number;
        };
        Returns: {
          last_active: string;
          project_id: string;
          similarity: number;
          snippet: string;
          title: string;
        }[];
      };
      match_user_memories: {
        Args: {
          p_embedding: string;
          p_limit?: number;
          p_min_similarity?: number;
        };
        Returns: {
          fact: string;
          id: string;
          importance: number;
          kind: string;
          similarity: number;
        }[];
      };
      plan_rank: { Args: { p_plan: string }; Returns: number };
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
          attachments: Json;
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
      rate_limit_hit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: {
          allowed: boolean;
          remaining: number;
          retry_after_seconds: number;
        }[];
      };
      rate_limit_prune: { Args: never; Returns: number };
      refresh_credit_cache: { Args: { p_user: string }; Returns: undefined };
      request_account_deletion: {
        Args: { p_reason?: string };
        Returns: {
          deleted_at: string;
          deletion_reason: string;
          email: string;
          id: string;
        }[];
      };
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
      retention_prune_embeddings: {
        Args: { p_dry_run?: boolean; p_older_than?: string };
        Returns: {
          affected: number;
          dry_run: boolean;
          oldest: string;
        }[];
      };
      retention_prune_mail: {
        Args: {
          p_delete_after?: string;
          p_dry_run?: boolean;
          p_strip_payload_after?: string;
        };
        Returns: {
          dry_run: boolean;
          payloads_cleared: number;
          rows_deleted: number;
        }[];
      };
      retention_rollup_ai_usage: {
        Args: { p_dry_run?: boolean; p_older_than?: string };
        Returns: {
          affected: number;
          dry_run: boolean;
          oldest: string;
        }[];
      };
      set_member_role: {
        Args: {
          p_org: string;
          p_role: Database["public"]["Enums"]["org_role"];
          p_user: string;
        };
        Returns: undefined;
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      social_connection_revoke: {
        Args: { p_platform: Database["public"]["Enums"]["social_platform"] };
        Returns: undefined;
      };
      touch_user_memories: { Args: { p_ids: string[] }; Returns: undefined };
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
      usage_generation_daily: {
        Args: { p_days: number; p_tz: string };
        Returns: {
          credits_refunded: number;
          credits_spent: number;
          day: string;
          failed: number;
          model: string;
          runs: number;
          succeeded: number;
        }[];
      };
      usage_model_calls: {
        Args: { p_days: number };
        Returns: {
          cached: number;
          calls: number;
          failed: number;
          input_tokens: number;
          model: string;
          output_tokens: number;
          p50_latency_ms: number;
          provider: string;
          task: string;
        }[];
      };
    };
    Enums: {
      asset_kind: "photo" | "video" | "audio";
      generation_status: "queued" | "generating" | "ready" | "failed" | "cancelled";
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
      generation_status: ["queued", "generating", "ready", "failed", "cancelled"],
      message_role: ["user", "assistant"],
      org_role: ["owner", "admin", "member"],
      post_status: ["scheduled", "publishing", "published", "failed"],
      social_platform: ["tiktok", "instagram", "facebook", "youtube"],
      user_role: ["user", "admin"],
    },
  },
} as const;
