import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

/**
 * The card a Beyond Social link turns into when it is pasted somewhere.
 *
 * Every link the product hands out, including the one the assistant sends
 * people to when it cannot answer something, was rendering as a bare grey URL
 * in iMessage, WhatsApp, Slack and X. A link with no card reads as a link
 * somebody is not sure about, which is the opposite of what a help link is for.
 *
 * Drawn rather than photographed. There is no screenshot here, and there should
 * not be: a card built from type stays true when the interface moves, and the
 * one thing worse than no preview is a preview of a screen that no longer looks
 * like that.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

/* Dark tokens from globals.css. Hardcoded because a generated image has no
   cascade to read them from, and a preview card has no theme to follow: it is
   composited onto whatever chrome the reader's app paints. */
const CANVAS = "#0b0b0e";
const INK = "#f4f4f5";
const INK_SOFT = "#8a8a94";
const PRIMARY = "#3b82f6";

/**
 * Geist, the face the rest of the site is set in.
 *
 * Held here as files rather than read out of the `geist` package, which does
 * not export its ttfs, and resolved from `process.cwd()` with a literal path so
 * the deployment's file tracer can see them and include them in the bundle. A
 * computed path traces to nothing and fails only once it is deployed.
 *
 * Static weights, because Satori cannot read a variable font, and ttf, because
 * it cannot read woff2 either.
 */
const FONT_DIR = "src/lib/og/fonts";

async function loadFonts() {
  const [regular, semibold] = await Promise.all([
    readFile(path.join(process.cwd(), FONT_DIR, "Geist-Regular.ttf")),
    readFile(path.join(process.cwd(), FONT_DIR, "Geist-SemiBold.ttf")),
  ]);

  return [
    { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: semibold, weight: 600 as const, style: "normal" as const },
  ];
}

/**
 * The domain shown along the bottom.
 *
 * `NEXT_PUBLIC_APP_URL` first, since that is the address we mean to be known
 * by, but it is only set on production and falls back to localhost silently
 * everywhere else. A preview card reading "localhost:3000" is worse than no
 * card, so Vercel's own hostname is the second answer: it is injected into
 * every deployment, including previews, and is at least somewhere real.
 *
 * Read at build time, not per request, because these images are static. The
 * host changes on the next deploy, not the next save.
 */
function displayHost(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    // The VERCEL_* pair are bare hostnames; NEXT_PUBLIC_APP_URL is a full URL.
    const withScheme = candidate.includes("://") ? candidate : `https://${candidate}`;
    try {
      const { host } = new URL(withScheme);
      if (host !== "localhost:3000") return host;
    } catch {
      continue;
    }
  }

  return "beyondsocial.app";
}

/**
 * One card: an eyebrow saying which part of the site this is, the page's own
 * name at display size, and a single line saying what is on it.
 */
export async function renderOgCard({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede: string;
}): Promise<ImageResponse> {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "80px",
        backgroundColor: CANVAS,
        // The same radial the marketing pages open with, so a preview and the
        // page it links to are recognisably the same surface.
        backgroundImage: `radial-gradient(900px 500px at 12% -10%, ${PRIMARY}26, transparent 70%)`,
        fontFamily: "Geist",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div
          style={{ width: "12px", height: "12px", borderRadius: "9999px", background: PRIMARY }}
        />
        <div
          style={{
            fontSize: "22px",
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: PRIMARY,
          }}
        >
          {eyebrow}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: title.length > 28 ? "76px" : "96px",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            color: INK,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: "28px",
            fontSize: "32px",
            lineHeight: 1.4,
            color: INK_SOFT,
            maxWidth: "900px",
          }}
        >
          {lede}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "24px",
          color: INK_SOFT,
        }}
      >
        <div style={{ fontWeight: 600, color: INK }}>Beyond Social</div>
        <div>{displayHost()}</div>
      </div>
    </div>,
    { ...OG_SIZE, fonts: await loadFonts() },
  );
}
