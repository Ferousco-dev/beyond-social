import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/card";

/**
 * The assistant sends people here when it cannot answer something, so this is
 * the link most likely to be forwarded to somebody else. It gets its own card.
 */

export const alt = "Beyond Social help centre";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgCard({
    eyebrow: "Help centre",
    title: "Answers, checked against the code",
    lede: "Charging, refusals, scheduling and time zones, connecting a platform, and what deleting an account really does.",
  });
}
