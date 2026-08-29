/**
 * Behaviour checks for the Apify row mapper. No token, no network.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/scrape-smoke.ts
 *
 * Actors are third-party code and disagree about field names, so the mapper
 * reads several aliases for each value. These pin that down: the day an actor
 * renames a key, a mapper that only knew one spelling returns nothing and the
 * feed silently empties.
 */
import { mapScrapedPost } from "../src/lib/social-scrape/map";
import { inputFor } from "../src/lib/social-scrape/search";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

/** The shape clockworks/tiktok-scraper returns. */
const tiktokRow = {
  id: "7284719283746152345",
  text: "three ways to style one jacket",
  webVideoUrl: "https://www.tiktok.com/@stylist/video/7284719283746152345",
  authorMeta: { name: "stylist" },
  playCount: 482_000,
  diggCount: 51_200,
  commentCount: 843,
  shareCount: 1_204,
  videoMeta: { duration: 27, coverUrl: "https://p16.tiktokcdn.com/cover.jpg" },
  hashtags: [{ name: "fashion" }, { name: "styling" }],
};

{
  const post = mapScrapedPost("tiktok", tiktokRow);
  check("a TikTok row maps", post !== null, post ? post.handle : "null");
  check("views are read", post?.viewCount === 482_000, String(post?.viewCount));
  check("duration is read", post?.durationSeconds === 27, String(post?.durationSeconds));
  check("nested cover is read", post?.thumbnailUrl?.includes("cover.jpg") === true);
  check(
    "object hashtags are flattened",
    post?.hashtags.join(",") === "fashion,styling",
    post?.hashtags.join(","),
  );
  check("no transcript is claimed", post?.transcript === null);
}

{
  // A different actor, same meaning, different spellings.
  const post = mapScrapedPost("tiktok", {
    url: "https://www.tiktok.com/@baker/video/7111111111111111111",
    username: "@baker",
    caption: "sourdough at 5am",
    views: "91000",
    hashtags: ["bread", "#baking"],
  });
  check("aliased field names still map", post !== null);
  check(
    "a numeric string view count is parsed",
    post?.viewCount === 91_000,
    String(post?.viewCount),
  );
  check("an @ is stripped from the handle", post?.handle === "baker", post?.handle);
  check(
    "a bare hashtag string is cleaned",
    post?.hashtags.join(",") === "bread,baking",
    post?.hashtags.join(","),
  );
}

{
  const post = mapScrapedPost("tiktok", { text: "no url here", authorMeta: { name: "ghost" } });
  check("a row with no usable URL is dropped", post === null, post ? "kept" : "");
}

{
  // Everything downstream embeds these, so a foreign host must not survive.
  const post = mapScrapedPost("tiktok", {
    webVideoUrl: "https://evil.example.com/@x/video/123456789",
    authorMeta: { name: "x" },
  });
  check("a non-TikTok host is refused", post === null, post ? "kept" : "");
}

{
  const post = mapScrapedPost("instagram", {
    shortCode: "C8xKq2Ltabc",
    ownerUsername: "roastery",
    caption: "new single origin",
    likesCount: 2_310,
    displayUrl: "https://scontent.cdninstagram.com/thumb.jpg",
  });
  check("an Instagram row maps from its shortcode", post !== null);
  check(
    "the reel URL is built",
    post?.url === "https://www.instagram.com/reel/C8xKq2Ltabc/",
    post?.url,
  );
  check("likes are read", post?.likeCount === 2_310, String(post?.likeCount));
}

{
  // The URL branch, which this file used to skip entirely: the id was taken by
  // splitting before the query was stripped, so a link carrying `?igsh=` used
  // the query as the post's identity.
  const post = mapScrapedPost("instagram", {
    url: "https://www.instagram.com/reel/C8xKq2Ltabc/?igsh=MzRlODBiNWFlZA==",
    ownerUsername: "roastery",
    caption: "new single origin",
  });
  check(
    "an Instagram id ignores the query string",
    post?.videoId === "C8xKq2Ltabc",
    String(post?.videoId),
  );
  check(
    "the query is stripped from the URL too",
    post?.url === "https://www.instagram.com/reel/C8xKq2Ltabc/",
    String(post?.url),
  );
}

{
  const post = mapScrapedPost("instagram", { caption: "orphan", likesCount: 5 });
  check("an Instagram row with no identity is dropped", post === null, post ? "kept" : "");
}

{
  check("a non-object row is dropped", mapScrapedPost("tiktok", "nonsense") === null);
  check("null is dropped", mapScrapedPost("tiktok", null) === null);
}

{
  // A resolved country routes the TikTok search through a proxy there.
  const withCountry = inputFor("tiktok", "fashion", 60, "NG");
  check(
    "a resolved country sets proxyCountryCode",
    withCountry.proxyCountryCode === "NG",
    String(withCountry.proxyCountryCode),
  );

  // No signal must mean an unbiased search, not an empty/invalid proxy value.
  const withoutCountry = inputFor("tiktok", "fashion", 60, null);
  check(
    "no country omits proxyCountryCode entirely",
    !("proxyCountryCode" in withoutCountry),
    JSON.stringify(withoutCountry),
  );

  // Instagram is reached by URL and was never part of the country-bias fix;
  // this pins that it stays untouched rather than silently picking it up.
  const instagram = inputFor("instagram", "fashion", 60, "NG");
  check(
    "Instagram's input carries no proxyCountryCode",
    !("proxyCountryCode" in instagram),
    JSON.stringify(instagram),
  );
}

process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
