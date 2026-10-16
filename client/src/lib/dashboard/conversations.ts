import "server-only";

import { z } from "zod";

import { goApi } from "@/lib/go-api/client";

import { type SidebarProject } from "./data";

const conversationsResponse = z.object({
  data: z.array(z.object({ id: z.string().uuid(), title: z.string(), updated_at: z.string() })),
});
const projectsResponse = z.object({
  data: z.array(z.object({ id: z.string().uuid(), title: z.string(), updated_at: z.string() })),
});

/** Recent video projects and chats for the sidebar. */
export async function getSidebarProjects(): Promise<readonly SidebarProject[]> {
  const [conversations, projects] = await Promise.all([
    goApi("/api/v1/conversations?limit=100", conversationsResponse),
    goApi("/api/v1/editor/projects", projectsResponse),
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
  return [...chats, ...videos].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
