import "server-only";

import { z } from "zod";

import { goApi } from "@/lib/go-api/client";
import { jobsListResponse } from "@/lib/go-api/schemas";

import { type SidebarProject } from "./data";

const conversationsResponse = z.object({
  data: z.array(z.object({ id: z.string().uuid(), title: z.string(), updated_at: z.string() })),
});
const projectsResponse = z.object({
  data: z.array(z.object({ id: z.string().uuid(), title: z.string(), updated_at: z.string() })),
});

// A draft appears while it is in progress, and for a while after it finishes:
// the UI's own poll can miss a completion (a backgrounded tab throttles its
// timer), so the only record of a finished job may be here. Once the person
// opens it, either they continue to video setup or they walk away; either way
// a draft that stayed forever once truly stale would just be clutter, so a
// completed one only counts for a couple of hours.
const draftJobTypes = new Set(["video_fetch", "video_analysis"]);
const inProgressStatuses = new Set(["queued", "running"]);
const completedDraftWindowMs = 2 * 60 * 60 * 1000;

function isDraftworthy(job: { readonly status: string; readonly updated_at: string }): boolean {
  if (inProgressStatuses.has(job.status)) return true;
  if (job.status !== "completed") return false;
  return Date.now() - new Date(job.updated_at).getTime() < completedDraftWindowMs;
}

function draftStage(type: string): "preview" | "analysis" | null {
  if (type === "video_fetch") return "preview";
  if (type === "video_analysis") return "analysis";
  return null;
}

/** Recent video projects, chats and in-progress "New Video" drafts for the sidebar. */
export async function getSidebarProjects(): Promise<readonly SidebarProject[]> {
  const [conversations, projects, jobs] = await Promise.all([
    goApi("/api/v1/conversations?limit=100", conversationsResponse),
    goApi("/api/v1/editor/projects", projectsResponse),
    goApi("/api/v1/jobs?limit=25", jobsListResponse),
  ]);
  const chats = conversations.ok
    ? conversations.data.data.map((item) => ({
        id: item.id,
        title: item.title || "New project",
        href: `/dashboard/c/${item.id}`,
        kind: "chat" as const,
        updatedAt: item.updated_at,
      }))
    : [];
  const videos = projects.ok
    ? projects.data.data.map((item) => ({
        id: item.id,
        title: item.title || "Untitled project",
        href: `/editor/${item.id}`,
        kind: "video" as const,
        updatedAt: item.updated_at,
      }))
    : [];
  const drafts = jobs.ok
    ? jobs.data.data
        .filter((job) => draftJobTypes.has(job.type) && isDraftworthy(job))
        .map((job) => {
          const stage = draftStage(job.type);
          const url = typeof job.input?.url === "string" ? job.input.url : "";
          const label = job.status === "completed" ? "Ready" : "Draft";
          return {
            id: job.id,
            title: url !== "" ? `${label}: ${url}` : `${label} video`,
            href: `/dashboard/new?option=link&job=${job.id}&stage=${stage ?? "preview"}`,
            kind: "draft" as const,
            updatedAt: job.updated_at,
          };
        })
    : [];
  return [...chats, ...videos, ...drafts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
