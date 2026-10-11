import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/card";

/**
 * The card for every route that does not draw its own.
 *
 * Next applies the nearest one in the tree, so this is the floor: no Beyond
 * Social link anywhere pastes as a bare URL, and a page only needs a file of
 * its own when it deserves a more specific line than this.
 */

export const alt = "Beyond Social";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgCard({
    eyebrow: "Beyond Social",
    title: "Short-form video, from a sentence",
    lede: "Describe what you want, or start from a product photo. It directs the shot, writes the script, and schedules the post.",
  });
}
