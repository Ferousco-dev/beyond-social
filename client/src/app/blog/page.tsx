import { type Metadata } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";
import { getPublishedPosts } from "@/features/blog/queries";

export const metadata: Metadata = { title: "Notes" };

export default async function BlogPage(): Promise<ReactNode> {
  const posts = await getPublishedPosts();

  return (
    <PageShell
      eyebrow="Company"
      title="Notes"
      lede="Working notes on building an AI video engine: retrieval, evaluation, and what it takes to make a generated shot look directed."
    >
      {posts.length === 0 ? (
        <Prose>
          <p>
            There is nothing here yet. The first note goes up when there is a result worth
            reporting rather than on a schedule.
          </p>
        </Prose>
      ) : (
        <ul className="flex flex-col gap-2">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block rounded-2xl border border-hairline bg-paper p-5 transition-colors hover:bg-cloud/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {post.category !== "" ? (
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                    {post.category}
                  </p>
                ) : null}
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink group-hover:underline">
                  {post.title}
                </h2>
                {post.excerpt !== "" ? (
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{post.excerpt}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
