"use server";

import { z } from "zod";

import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import { blogListResponse, blogResponse } from "@/lib/go-api/schemas";
import type { GoBlogPost } from "@/lib/go-api/schemas";

export type BlogAdminResult =
  | { readonly status: "ok"; readonly post: GoBlogPost }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string };

const postSchema = z.object({
  slug: z.string().trim().toLowerCase().min(1).max(120),
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().max(500),
  content: z.string(),
  featured_image: z.string().trim().max(2000),
  category: z.string().trim().max(80),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
  seo_title: z.string().trim().max(200),
  seo_description: z.string().trim().max(500),
  status: z.enum(["draft", "published"]),
});

function bodyOf(data: z.infer<typeof postSchema>): Record<string, unknown> {
  return { ...data };
}

export async function listAllPosts(): Promise<
  | { readonly status: "ok"; readonly posts: readonly GoBlogPost[] }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string }
> {
  if (!isGoApiConfigured()) return { status: "unconfigured" };
  const result = await goApi("/api/v1/admin/blog?limit=100", blogListResponse);
  return result.ok
    ? { status: "ok", posts: result.data.data }
    : { status: "error", message: result.message };
}

export async function getAnyPost(id: string): Promise<BlogAdminResult> {
  if (!z.string().uuid().safeParse(id).success) return { status: "error", message: "Unknown post." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };
  const result = await goApi(`/api/v1/admin/blog/${id}`, blogResponse);
  return result.ok ? { status: "ok", post: result.data.data } : { status: "error", message: result.message };
}

export async function createPost(input: z.input<typeof postSchema>): Promise<BlogAdminResult> {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Check the fields and try again." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };
  const result = await goApi("/api/v1/admin/blog", blogResponse, { method: "POST", body: bodyOf(parsed.data) });
  return result.ok ? { status: "ok", post: result.data.data } : { status: "error", message: result.message };
}

export async function updatePost(id: string, input: z.input<typeof postSchema>): Promise<BlogAdminResult> {
  if (!z.string().uuid().safeParse(id).success) return { status: "error", message: "Unknown post." };
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Check the fields and try again." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };
  const result = await goApi(`/api/v1/admin/blog/${id}`, blogResponse, { method: "PUT", body: bodyOf(parsed.data) });
  return result.ok ? { status: "ok", post: result.data.data } : { status: "error", message: result.message };
}

export async function deletePost(id: string): Promise<{ readonly status: "ok" } | { readonly status: "error"; readonly message: string }> {
  if (!z.string().uuid().safeParse(id).success) return { status: "error", message: "Unknown post." };
  if (!isGoApiConfigured()) return { status: "error", message: "The backend is not connected yet." };
  const result = await goApi(`/api/v1/admin/blog/${id}`, z.null(), { method: "DELETE" });
  return result.ok ? { status: "ok" } : { status: "error", message: result.message };
}
