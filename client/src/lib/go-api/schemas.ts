import { z } from "zod";

/** The Go API's response shapes, validated at the boundary. Optional means "not reported". */

const videoSchema = z.object({
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

const discoverySchema = z.object({
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

const avatarSchema = z.object({
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

const voiceSchema = z.object({
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
    credits: z.number().int(),
    plan: z.enum(["free", "pro"]),
  }),
});

export const nameResponse = z.object({ data: z.object({ name: z.string() }) });

export const ticketResponse = z.object({ data: z.object({ path: z.string(), token: z.string() }) });
export const handoffResponse = z.object({ data: z.object({ token: z.string(), expires_at: z.string() }) });

const workflowStepSchema = z.object({
  id: z.string(),
  step_id: z.string(),
  tool: z.string(),
  args: z.record(z.string(), z.unknown()),
  needs: z.array(z.string()),
  status: z.enum(["pending", "running", "completed", "failed", "skipped"]),
  attempts: z.number(),
  output: z.record(z.string(), z.unknown()),
  error: z.string(),
});
export type GoWorkflowStep = z.infer<typeof workflowStepSchema>;

const workflowSchema = z.object({
  id: z.string(),
  objective: z.string(),
  status: z.enum([
    "draft",
    "awaiting_clarification",
    "awaiting_approval",
    "approved",
    "running",
    "completed",
    "failed",
    "cancelled",
  ]),
  plan: z.record(z.string(), z.unknown()),
  plan_hash: z.string(),
  error: z.string(),
  steps: z.array(workflowStepSchema),
});
export type GoWorkflow = z.infer<typeof workflowSchema>;

export const workflowResponse = z.object({ data: workflowSchema });

const attachmentSchema = z.object({
  id: z.string(),
  kind: z.enum(["image", "video", "audio"]),
  name: z.string(),
  mime_type: z.string(),
  size_bytes: z.number(),
});
export type Attachment = z.infer<typeof attachmentSchema>;

export const uploadSlotResponse = z.object({ data: z.object({ id: z.string(), path: z.string(), token: z.string() }) });
export const attachmentResponse = z.object({ data: attachmentSchema });
export const viewUrlResponse = z.object({ data: z.object({ url: z.string() }) });

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  workflow_id: z.string().optional(),
  job_id: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
  /** Present when the message proposed a script for the user to approve. */
  script: z.object({ title: z.string(), scenes: z.array(z.object({ seconds: z.number(), visual: z.string() })) }).optional(),
  created_at: z.string(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const conversationResponse = z.object({ data: z.object({ id: z.string(), title: z.string() }) });
export const threadResponse = z.object({
  data: z.object({
    conversation: z.object({ id: z.string(), title: z.string() }),
    messages: z.array(chatMessageSchema),
  }),
});
export const exchangeResponse = z.object({
  data: z.object({ user: chatMessageSchema, assistant: chatMessageSchema }),
});

export const creditsResponse = z.object({
  data: z.object({
    balance: z.number().int(),
    history: z.array(
      z.object({
        kind: z.string(),
        amount: z.number().int(),
        balanceAfter: z.number().int(),
        reason: z.string(),
        createdAt: z.string(),
      }),
    ),
  }),
});

export const socialListResponse = z.object({
  data: z.array(
    z.object({
      platform: z.enum(["youtube", "tiktok", "instagram"]),
      label: z.string(),
      available: z.boolean(),
      connected: z.boolean(),
      needs_reconnect: z.boolean(),
      account_name: z.string().optional(),
    }),
  ),
});
export type SocialStatus = z.infer<typeof socialListResponse>["data"][number];
export const connectUrlResponse = z.object({ data: z.object({ url: z.string().url() }) });

const postSchema = z.object({
  id: z.string(),
  platform: z.enum(["youtube", "tiktok", "instagram"]),
  title: z.string().optional(),
  caption: z.string(),
  visibility: z.string(),
  scheduled_at: z.string(),
  status: z.enum(["preparing", "scheduled", "publishing", "published", "failed", "cancelled"]),
  external_url: z.string().optional(),
  error: z.string().optional(),
});
export type ScheduledPost = z.infer<typeof postSchema>;
export const postsResponse = z.object({ data: z.array(postSchema) });
export const postResponse = z.object({ data: postSchema });

const editorProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  conversation_id: z.string().optional(),
  document: z.unknown(),
  version: z.number().int(),
  updated_at: z.string(),
});
export const wordsResponse = z.object({
  data: z.object({ words: z.array(z.object({ text: z.string(), start: z.number(), end: z.number() })) }),
});

export const editorProjectResponse = z.object({ data: editorProjectSchema });

const usageSnapshotSchema = z.object({
  plan: z.enum(["free", "pro"]),
  five_hour_used: z.number(),
  five_hour_limit: z.number(),
  five_hour_resets_at: z.string().nullable(),
  week_used: z.number(),
  week_limit: z.number(),
  week_resets_at: z.string(),
  overage_enabled: z.boolean(),
  overage_cap: z.number(),
  overage_used: z.number(),
});
export type UsageSnapshot = z.infer<typeof usageSnapshotSchema>;
export const usageResponse = z.object({ data: z.object({ usage: usageSnapshotSchema, credits: z.number() }) });

export const plansResponse = z.object({
  data: z.object({
    pro_price_cents: z.number(),
    free_credits: z.number(),
    free_price_multiplier_pct: z.number(),
    free_avatars: z.number(),
    free_searches_per_day: z.number(),
    free_search_results: z.number(),
    pro_five_hour_limit: z.number(),
    pro_week_limit: z.number(),
  }),
});
export type PlanInfo = z.infer<typeof plansResponse>["data"];

const packSchema = z.object({
  id: z.string(),
  name: z.string(),
  credits: z.number().int(),
  price_cents: z.number().int(),
  currency: z.string(),
  enabled: z.boolean(),
  sort: z.number().int(),
});
export type CreditPack = z.infer<typeof packSchema>;
export const packsResponse = z.object({ data: z.array(packSchema) });

const paymentSchema = z.object({
  id: z.string(),
  pack_name: z.string(),
  credits: z.number().int(),
  amount_cents: z.number().int(),
  currency: z.string(),
  status: z.enum(["pending", "paid", "refunded"]),
  credits_removed: z.number().int(),
  created_at: z.string(),
});
export type Payment = z.infer<typeof paymentSchema>;
export const paymentsResponse = z.object({ data: z.array(paymentSchema) });
export const checkoutResponse = z.object({ data: z.object({ url: z.string().url() }) });

const libraryItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  prompt: z.string().optional(),
  video_url: z.string().url(),
  thumbnail_url: z.string().optional(),
  duration_seconds: z.number().optional(),
  created_at: z.string(),
});
export type LibraryItem = z.infer<typeof libraryItemSchema>;
export const libraryResponse = z.object({ data: z.array(libraryItemSchema) });

export const memoryResponse = z.object({
  data: z.object({
    enabled: z.boolean(),
    limit: z.number(),
    facts: z.array(z.object({ id: z.string(), content: z.string() })),
  }),
});
