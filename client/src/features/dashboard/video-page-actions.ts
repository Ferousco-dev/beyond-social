"use server";

import { z } from "zod";

import { goApi } from "@/lib/go-api/client";
import { editorProjectResponse, libraryResponse, type LibraryItem } from "@/lib/go-api/schemas";

/** How many videos a page holds. One more is asked for, to know if there is a next page. */
const VIDEO_PAGE = 15;

export type VideoPage =
  | { readonly ok: true; readonly items: readonly LibraryItem[]; readonly hasMore: boolean }
  | { readonly ok: false; readonly message: string };

const projectList = z.object({ data: z.array(z.object({ id: z.string().uuid() })) });

/**
 * Stands in for a server that does not send project_id yet (an API not yet
 * redeployed): a project's timeline keeps the id of the job that made the
 * video, so the match is made there. Once the API sends project_id this is
 * never reached, so it costs nothing.
 */
async function withProjects(items: readonly LibraryItem[]): Promise<readonly LibraryItem[]> {
  if (items.every((item) => item.project_id)) return items;
  const projects = await goApi("/api/v1/editor/projects?limit=30", projectList);
  if (!projects.ok) return items;
  const documents = await Promise.all(
    projects.data.data.map(async (project) => {
      const result = await goApi(`/api/v1/editor/projects/${project.id}`, editorProjectResponse);
      return { id: project.id, text: result.ok ? JSON.stringify(result.data.data.document ?? "") : "" };
    }),
  );
  return items.map((item) => {
    if (item.project_id) return item;
    const hit = documents.find((doc) => doc.text.includes(item.id));
    return hit ? { ...item, project_id: hit.id } : item;
  });
}

/** One page of finished videos, metadata only: no video file is touched here. */
export async function loadVideos(offset: number): Promise<VideoPage> {
  const parsed = z.number().int().min(0).max(10_000).safeParse(offset);
  if (!parsed.success) return { ok: false, message: "That page could not be found." };
  const result = await goApi(`/api/v1/library?limit=${VIDEO_PAGE + 1}&offset=${parsed.data}&light=1`, libraryResponse);
  if (!result.ok) return { ok: false, message: result.message };
  const all = result.data.data;
  return { ok: true, items: await withProjects(all.slice(0, VIDEO_PAGE)), hasMore: all.length > VIDEO_PAGE };
}
