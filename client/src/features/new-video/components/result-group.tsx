import type { DiscoverPost } from "@/features/discover/types";

import { formatCount } from "../lib";

/** One reference group: previews, source data, metrics, select to analyse. */
export function ResultGroup({
  title,
  note,
  posts,
  onSelect,
}: {
  title: string;
  note?: string;
  posts: readonly DiscoverPost[];
  onSelect: (url: string) => void;
}) {
  if (posts.length === 0) return null;
  return (
    <section aria-label={title}>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {note ? <p className="mt-0.5 text-xs text-ink-soft">{note}</p> : null}
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {posts.map((post) => (
          <li key={post.videoId}>
            <button
              type="button"
              onClick={() => onSelect(post.url)}
              className="block w-full cursor-pointer rounded-xl border border-hairline bg-paper p-3 text-left transition-colors hover:bg-cloud/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <p className="truncate text-sm font-medium text-ink">
                {post.handle !== "" ? `@${post.handle}` : post.platform}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-soft">{post.caption}</p>
              <p className="mt-2 text-xs tabular-nums text-ink-soft">
                {formatCount(post.viewCount)} views · {formatCount(post.likeCount)} likes
              </p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
