import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";
import { getPublishedPost, getPublishedPosts } from "@/features/blog/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "Notes" };
  return {
    title: post.seo_title !== "" ? post.seo_title : post.title,
    description: post.seo_description !== "" ? post.seo_description : post.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<ReactNode> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const published = post.published_at ? new Date(post.published_at) : null;

  return (
    <PageShell
      eyebrow={post.category !== "" ? post.category : "Notes"}
      title={post.title}
      lede={post.excerpt}
    >
      <Prose>
        {published ? (
          <p className="text-sm text-ink-soft">
            {published.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        ) : null}
        {post.content.split(/\n{2,}/).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
        <p>
          <Link
            href="/blog"
            className="rounded-sm text-ink underline underline-offset-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            All notes
          </Link>
        </p>
      </Prose>
    </PageShell>
  );
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const posts = await getPublishedPosts(100);
  return posts.map((post) => ({ slug: post.slug }));
}
