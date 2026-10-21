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

// A draft only appears while it is still in progress. Once the analysis
// completes, the person either continues to video setup (it drops off this
// list because they are past it) or walks away; a draft that goes stale here
// forever would just be clutter.
const draftJobTypes = new Set(["video_fetch", "video_analysis"]);
const draftStatuses = new Set(["queued", "running"]);

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
        .filter((job) => draftJobTypes.has(job.type) && draftStatuses.has(job.status))
        .map((job) => {
          const stage = draftStage(job.type);
          const url = typeof job.input?.url === "string" ? job.input.url : "";
          return {
            id: job.id,
            title: url !== "" ? `Draft: ${url}` : "Draft video",
            href: `/dashboard/new?option=link&job=${job.id}&stage=${stage ?? "preview"}`,
            kind: "draft" as const,
            updatedAt: job.updated_at,
          };
        })
    : [];
  return [...chats, ...videos, ...drafts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
