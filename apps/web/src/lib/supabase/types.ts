// Hand-written to match supabase/migrations. Regenerate from the live database
// with `supabase gen types typescript --local` once the stack is running.

export type GenerationStatus = "queued" | "generating" | "ready" | "failed";
export type SocialPlatform = "tiktok" | "instagram" | "facebook" | "youtube";
export type PostStatus = "scheduled" | "publishing" | "published" | "failed";
export type MessageRole = "user" | "assistant";

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  plan: string;
  credits_total: number;
  credits_used: number;
  credits_period_start: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  project_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface VideoGenerationRow {
  id: string;
  project_id: string;
  user_id: string;
  provider: string;
  model: string;
  prompt: string;
  aspect_ratio: string;
  resolution: string;
  duration: number;
  image_urls: string[];
  status: GenerationStatus;
  provider_task_id: string | null;
  result_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduledPostRow {
  id: string;
  user_id: string;
  generation_id: string | null;
  platform: SocialPlatform;
  caption: string;
  hashtags: string;
  scheduled_for: string;
  status: PostStatus;
  external_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      projects: Table<ProjectRow>;
      messages: Table<MessageRow>;
      video_generations: Table<VideoGenerationRow>;
      scheduled_posts: Table<ScheduledPostRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      generation_status: GenerationStatus;
      social_platform: SocialPlatform;
      post_status: PostStatus;
    };
  };
}
