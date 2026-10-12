import { z } from "zod";

/** The Go API's response shapes, validated at the boundary. Optional means "not reported". */

export const videoSchema = z.object({
  id: z.string(),
  platform: z.enum(["tiktok", "instagram"]),
  source_video_id: z.string(),
  url: z.string(),
  caption: z.string().optional(),
  creator_handle: z.string().optional(),
  creator_name: z.string().optional(),
  thumbnail_url: z.string().optional(),
  video_url: z.string().optional(),
  duration_seconds: z.number().optional(),
  view_count: z.number().optional(),
  like_count: z.number().optional(),
  comment_count: z.number().optional(),
  share_count: z.number().optional(),
  hashtags: z.array(z.string()),
  published_at: z.string().optional(),
  discovered_at: z.string(),
});
export type GoVideo = z.infer<typeof videoSchema>;

export const discoverySchema = z.object({
  id: z.string(),
  platform: z.enum(["tiktok", "instagram"]),
  status: z.enum(["queued", "running", "completed", "failed"]),
  result_count: z.number(),
  error: z.string().optional(),
});

export const jobSchema = z.object({
  id: z.string(),
  status: z.enum(["queued", "running", "completed", "failed", "ready"]),
  stage: z.string().optional(),
  progress: z.number(),
  error: z.string().optional(),
  result: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type GoJob = z.infer<typeof jobSchema>;

export const discoveryResponse = z.object({ data: discoverySchema });
export const videosResponse = z.object({ data: z.array(videoSchema) });
export const jobResponse = z.object({ data: jobSchema });

export const avatarSchema = z.object({
  id: z.string(),
  name: z.string(),
  is_default: z.boolean(),
  status: z.enum(["training", "awaiting_consent", "ready", "failed"]),
  consent_url: z.string().optional(),
  voice_id: z.string().optional(),
  preview_image_url: z.string().optional(),
  preview_video_url: z.string().optional(),
  error: z.string().optional(),
  created_at: z.string(),
});
export type GoAvatar = z.infer<typeof avatarSchema>;
export const avatarResponse = z.object({ data: avatarSchema });

export const voiceSchema = z.object({
  voice_id: z.string(),
  name: z.string(),
  scope: z.enum(["own", "library"]),
  language: z.string().optional(),
  gender: z.string().optional(),
});
export type GoVoice = z.infer<typeof voiceSchema>;
export const voicesListResponse = z.object({ data: z.array(voiceSchema) });
export const avatarsListResponse = z.object({ data: z.array(avatarSchema) });

export const meResponse = z.object({
  data: z.object({
    user_id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.enum(["user", "admin"]),
    plan: z.string(),
  }),
});

export const ticketResponse = z.object({ data: z.object({ path: z.string(), token: z.string() }) });
export const handoffResponse = z.object({ data: z.object({ token: z.string(), expires_at: z.string() }) });
