import Image from "next/image";
import { type ReactNode } from "react";

export type BlogArticleDraft = {
  readonly category: string;
  readonly title: string;
  readonly excerpt: string;
  readonly content: string;
  readonly featuredImage: string;
  readonly publishedAt?: string | null;
};

export function BlogArticleBody({ post }: { readonly post: BlogArticleDraft }): ReactNode {
  return (
    <div className="flex flex-col gap-5 text-base leading-relaxed text-ink-soft">
      {post.featuredImage ? (
        <Image
          src={post.featuredImage}
          alt={`${post.title} featured image`}
          width={1200}
          height={675}
          unoptimized
          className="aspect-video w-full rounded-lg object-cover"
        />
      ) : null}
      {post.publishedAt ? (
        <p className="text-sm text-ink-soft">
          {new Date(post.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      ) : null}
      {post.content.split(/\n{2,}/).filter((paragraph) => paragraph.trim() !== "").map((paragraph, index) => (
        <p key={index} className="whitespace-pre-wrap">{paragraph}</p>
      ))}
    </div>
  );
}