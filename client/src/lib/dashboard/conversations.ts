import "server-only";

import { z } from "zod";

import { goApi } from "@/lib/go-api/client";

import { type SidebarProject } from "./data";

const listResponse = z.object({ data: z.array(z.object({ id: z.string(), title: z.string() })) });

/** The user's recent chats for the sidebar. A failure shows an empty list, not an error page. */
export async function getSidebarConversations(): Promise<readonly SidebarProject[]> {
  const result = await goApi("/api/v1/conversations?limit=30", listResponse);
  if (!result.ok) return [];
  return result.data.data.map((c) => ({ id: c.id, title: c.title || "New chat", group: "Recent", pinned: false }));
}
