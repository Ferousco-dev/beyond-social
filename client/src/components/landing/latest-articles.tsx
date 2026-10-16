import Image from "next/image";
import Link from "next/link";
import { type ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { getPublishedPosts } from "@/features/blog/queries";
import type { GoBlogPost } from "@/lib/go-api/schemas";

import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

function publicationDate(post: GoBlogPost): string {
  const date = new Date(post.published_at ?? post.created_at);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function ArticleCard({ post }: { readonly post: GoBlogPost }): ReactNode {
  const date = publicationDate(post);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-paper transition-colors duration-200 hover:bg-cloud/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {post.featured_image !== "" ? (
        <Image
          src={post.featured_image}
          alt={`${post.title} featured image`}
          width={720}
          height={405}
          sizes="(max-width: 767px) calc(100vw - 2.5rem), (max-width: 1023px) calc(50vw - 2rem), 384px"
          unoptimized
          className="aspect-video w-full object-cover"
        />
      ) : null}
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
          {post.category !== "" ? post.category : "Notes"}
        </p>
        <h3 className="mt-3 text-balance text-xl font-semibold tracking-tight text-ink group-hover:underline">
          {post.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-soft">{post.excerpt}</p>
        {date !== "" ? <p className="mt-5 text-xs text-ink-soft">{date}</p> : null}
      </div>
    </Link>
  );
}

/** The latest published editorial posts, omitted until there is something to read. */
export async function LatestArticles(): Promise<ReactNode> {
  const posts = await getPublishedPosts(3);

  if (posts.length === 0) return null;

  return (
    <section className="border-t border-hairline py-24 sm:py-32" aria-label="Latest from the Blog">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
        <SectionHeading
          eyebrow="Notes"
          title="Latest from the Blog"
          description="Practical notes from the team building Beyond Social."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => (
            <Reveal key={post.id} delay={index * 50}>
              <ArticleCard post={post} />
            </Reveal>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/blog" className={buttonVariants({ variant: "outline", size: "lg" })}>
            View All Articles
          </Link>
        </div>
      </div>
    </section>
  );
}
