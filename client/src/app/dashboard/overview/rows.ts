import { z } from "zod";

import {
  summarise,
  type ActivityEvent,
  type AttentionItem,
  type RunningGeneration,
  type UpcomingPost,
} from "@/features/dashboard/components/overview/types";

/**
 * The database boundary for the overview.
 *
 * Rows are parsed rather than cast: an embedded relation and a Postgres enum
 * both arrive as `unknown` in practice, and a wrong assumption here would
 * surface as a blank panel with no explanation.
 */

const generationStatus = z.enum(["queued", "generating", "ready", "failed"]);
const postStatus = z.enum(["scheduled", "publishing", "published", "failed"]);
const platform = z.enum(["tiktok", "instagram", "facebook", "youtube"]);

/**
 * PostgREST returns an embedded many-to-one as an object, but returns an array
 * when it cannot prove the relation is unique. Both are accepted so a schema
 * change cannot silently empty the project column.
 */
const projectRef = z
  .union([z.object({ title: z.string() }), z.array(z.object({ title: z.string() }))])
  .nullish();

type ProjectRef = z.infer<typeof projectRef>;

function refTitle(ref: ProjectRef): string | null {
  if (!ref) return null;
  return Array.isArray(ref) ? (ref[0]?.title ?? null) : ref.title;
}

const generationRowSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  prompt: z.string(),
  status: generationStatus,
  error: z.string().nullish(),
  created_at: z.string(),
  updated_at: z.string(),
  projects: projectRef,
});

const postRowSchema = z.object({
  id: z.string(),
  platform,
  caption: z.string(),
  error: z.string().nullish(),
  scheduled_for: z.string(),
  status: postStatus,
});

export const GENERATION_COLUMNS =
  "id, project_id, prompt, status, error, created_at, updated_at, projects(title)";
export const POST_COLUMNS = "id, platform, caption, error, scheduled_for, status";

type GenerationRow = z.infer<typeof generationRowSchema>;
type PostRow = z.infer<typeof postRowSchema>;

/** Rows that fail to parse are dropped, never guessed at. */
export function parseGenerations(data: unknown): readonly GenerationRow[] {
  return z.array(generationRowSchema).safeParse(data).data ?? [];
}

export function parsePosts(data: unknown): readonly PostRow[] {
  return z.array(postRowSchema).safeParse(data).data ?? [];
}

const UNTITLED_GENERATION = "Untitled video";
const UNTITLED_POST = "Untitled post";

export function toRunning(row: GenerationRow): RunningGeneration | null {
  if (row.status !== "queued" && row.status !== "generating") return null;
  return {
    id: row.id,
    projectId: row.project_id,
    projectTitle: refTitle(row.projects),
    prompt: summarise(row.prompt, UNTITLED_GENERATION),
    status: row.status,
    startedAt: row.created_at,
  };
}

export function toUpcoming(row: PostRow): UpcomingPost | null {
  if (row.status !== "scheduled" && row.status !== "publishing") return null;
  return {
    id: row.id,
    platform: row.platform,
    caption: summarise(row.caption, UNTITLED_POST),
    scheduledFor: row.scheduled_for,
    status: row.status,
  };
}

export function generationAttention(row: GenerationRow): AttentionItem {
  return {
    id: row.id,
    source: "generation",
    title: summarise(row.prompt, UNTITLED_GENERATION),
    reason: row.error ?? null,
    at: row.updated_at,
    projectId: row.project_id,
  };
}

export function postAttention(row: PostRow): AttentionItem {
  return {
    id: row.id,
    source: "post",
    title: summarise(row.caption, UNTITLED_POST),
    reason: row.error ?? null,
    at: row.scheduled_for,
    projectId: null,
  };
}

export function generationActivity(row: GenerationRow): ActivityEvent {
  return {
    id: `generation-${row.id}`,
    kind: "generated",
    title: summarise(row.prompt, UNTITLED_GENERATION),
    platform: null,
    at: row.updated_at,
  };
}

export function postActivity(row: PostRow): ActivityEvent {
  return {
    id: `post-${row.id}`,
    kind: "published",
    title: summarise(row.caption, UNTITLED_POST),
    platform: row.platform,
    at: row.scheduled_for,
  };
}
