// Named aliases over the generated database types in `./database.types.ts`
// (produced by `supabase gen types typescript --linked`). The generated file is
// the source of truth; regenerate it after a schema change. These aliases keep
// the app's imports stable so call sites never depend on the generated shape
// directly.
import type { Database } from "./database.types";

export type { Database };

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type ProfileRow = Tables["profiles"]["Row"];
export type ProjectRow = Tables["projects"]["Row"];
export type MessageRow = Tables["messages"]["Row"];
export type VideoGenerationRow = Tables["video_generations"]["Row"];
export type ScheduledPostRow = Tables["scheduled_posts"]["Row"];

export type GenerationStatus = Enums["generation_status"];
export type SocialPlatform = Enums["social_platform"];
export type PostStatus = Enums["post_status"];
export type MessageRole = Enums["message_role"];
