import "server-only";

import { cache } from "react";
import { z } from "zod";

import { goApi } from "@/lib/go-api/client";

import { type SidebarProject } from "./data";

const projectsResponse = z.object({
  data: z.array(z.object({ id: z.string().uuid(), title: z.string(), updated_at: z.string() })),
});

/** Recent video projects for the sidebar. */
export const getSidebarProjects = cache(async (): Promise<readonly SidebarProject[]> => {
  const projects = await goApi("/api/v1/editor/projects?limit=40", projectsResponse);
  if (!projects.ok) return [];
  return projects.data.data
    .map((item) => ({
      id: item.id,
      title: item.title || "Untitled project",
      href: `/editor/${item.id}`,
      kind: "video" as const,
      updatedAt: item.updated_at,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
});
