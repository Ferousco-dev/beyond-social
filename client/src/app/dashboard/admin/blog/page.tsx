import { type Metadata } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { listAllPosts } from "@/features/blog/admin-actions";

export const metadata: Metadata = { title: "Admin · Blog" };

export default async function AdminBlogPage(): Promise<ReactNode> {
  const result = await listAllPosts();

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="min-w-0 flex-1 text-2xl font-semibold tracking-tight text-ink">Blog</h1>
        <Link
          href="/dashboard/admin/blog/new"
          className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          New post
        </Link>
      </div>

      {result.status !== "ok" ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {result.status === "unconfigured" ? "The backend is not connected yet." : result.message}
        </p>
      ) : result.posts.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">No posts yet. Create the first one.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {result.posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/dashboard/admin/blog/${post.id}`}
                className="flex items-center gap-3 rounded-xl border border-hairline bg-paper px-4 py-3 transition-colors hover:bg-cloud/60"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                  {post.title}
                </span>
                <span className="shrink-0 rounded-full border border-hairline px-2 py-0.5 text-[11px] text-ink-soft">
                  {post.status}
                </span>
                <time className="shrink-0 text-xs text-ink-soft" dateTime={post.published_at ?? post.updated_at}>
                  {post.published_at
                    ? `Published ${new Date(post.published_at).toLocaleDateString("en-US")}`
                    : `Updated ${new Date(post.updated_at).toLocaleDateString("en-US")}`}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
