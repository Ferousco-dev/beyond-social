import { type MetadataRoute } from "next";

/**
 * The installable app.
 *
 * `display: standalone` is what makes an installed copy open without browser
 * chrome. `start_url` is the dashboard rather than the marketing page: someone
 * who installed the app has already decided, and landing them on a pitch is a
 * wasted tap. Signed-out visitors are redirected to login from there anyway.
 *
 * The icons are the real logo mark resized, not new artwork. `maskable` is
 * declared because the mark already sits inside enough padding to survive
 * Android's circular and squircle masks.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Beyond Social",
    short_name: "Beyond",
    description:
      "AI-powered social media video platform, from idea to published short-form video.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#f8fafc",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
