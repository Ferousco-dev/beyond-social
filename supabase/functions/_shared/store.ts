// deno-lint-ignore-file no-explicit-any
// Copies a finished render from the (temporary) provider URL into the durable
// `renders` bucket and returns the permanent public URL. Falls back to the
// source URL if the copy fails, so a storage hiccup never loses the result.
import { isSafeRenderUrl, readBounded, MAX_RENDER_BYTES } from "./fetch-guard.ts";
import { log } from "./trace.ts";

/** Only what a render can legitimately be. */
const ALLOWED_CONTENT_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/octet-stream",
];

export async function persistRender(
  admin: any,
  userId: string,
  taskId: string,
  sourceUrl: string,
): Promise<string> {
  /*
   * The URL is checked before it is fetched, not after. It arrives in a webhook
   * body, and this function runs with the service role inside the platform's
   * network: an unchecked fetch reaches internal addresses, and whatever comes
   * back is uploaded to a public bucket under our own domain.
   */
  if (!isSafeRenderUrl(sourceUrl)) {
    log("warn", "refused to fetch an unsafe render url", { taskId });
    return sourceUrl;
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) return sourceUrl;

  // A response that is not a video is not a render, whatever the URL claimed.
  const contentType = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (contentType !== "" && !ALLOWED_CONTENT_TYPES.includes(contentType)) {
    log("warn", "refused a render with an unexpected content type", { taskId, contentType });
    return sourceUrl;
  }

  const bytes = await readBounded(response, MAX_RENDER_BYTES);
  if (!bytes) {
    log("warn", "render exceeded the size limit", { taskId });
    return sourceUrl;
  }

  const path = `${userId}/${taskId}.mp4`;

  const { error } = await admin.storage
    .from("renders")
    .upload(path, bytes, { contentType: "video/mp4", upsert: true });
  if (error) return sourceUrl;

  const { data } = admin.storage.from("renders").getPublicUrl(path);
  return data?.publicUrl ?? sourceUrl;
}
