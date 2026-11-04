import type { DiscoverPost } from "@/features/discover/types";

import { PostTile } from "@/features/discover/components/post-tile";

/** One reference group of playable video posters. */
export function ResultGroup({
  title,
  note,
  posts,
  selectedId,
  onSelect,
}: {
  title: string;
  note?: string;
  posts: readonly DiscoverPost[];
  selectedId: string | null;
  onSelect: (post: DiscoverPost) => void;
}) {
  if (posts.length === 0) return null;
  return (
    <section aria-label={title}>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {note ? <p className="mt-0.5 text-xs text-ink-soft">{note}</p> : null}
      <ul className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {posts.map((post) => <PostTile key={post.videoId} post={post} selected={selectedId === post.videoId} onSelect={() => onSelect(post)} />)}
      </ul>
    </section>
  );
}
