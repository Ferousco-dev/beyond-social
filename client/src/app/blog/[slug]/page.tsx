import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode } from "react";

import { PageShell } from "@/components/landing/page-shell";
import { BlogArticleBody } from "@/features/blog/components/blog-article-body";
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

  return (
    <PageShell
      eyebrow={post.category !== "" ? post.category : "Notes"}
      title={post.title}
      lede={post.excerpt}
    >
      <BlogArticleBody post={{
        category: post.category,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        featuredImage: post.featured_image,
        publishedAt: post.published_at,
      }} />
      <div className="mt-10">
        <p>
          <Link
            href="/blog"
            className="rounded-sm text-ink underline underline-offset-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            All notes
          </Link>
        </p>
      </div>
    </PageShell>
  );
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const posts = await getPublishedPosts(100);
  return posts.map((post) => ({ slug: post.slug }));
}
