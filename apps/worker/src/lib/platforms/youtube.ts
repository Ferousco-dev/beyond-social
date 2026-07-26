import { raise, type PlatformPublisher, type PublishRequest, type PublishOutcome } from "./types";

/**
 * YouTube Shorts via the Data API.
 *
 * Unlike the others, YouTube will not fetch a URL: the bytes have to be sent to
 * it. This uses the resumable protocol, which is two requests (start a session,
 * then upload to the returned URL) and is what YouTube recommends for anything
 * that is not tiny.
 *
 * A video is treated as a Short by YouTube based on its length and aspect
 * ratio, not by anything we can set here, so there is no "shorts" flag to send.
 */
const UPLOAD = "https://www.googleapis.com/upload/youtube/v3/videos";

/** YouTube titles are hard-capped; a longer one is rejected, not truncated. */
const MAX_TITLE = 100;
const MAX_DESCRIPTION = 5000;

export class YouTubePublisher implements PlatformPublisher {
  readonly platform = "youtube";

  constructor(private readonly doFetch: typeof globalThis.fetch = globalThis.fetch) {}

  async publish(request: PublishRequest): Promise<PublishOutcome> {
    const source = await this.doFetch(request.videoUrl);
    if (!source.ok) throw new Error(`Could not read the render: HTTP ${source.status}`);
    const bytes = new Uint8Array(await source.arrayBuffer());

    const uploadUrl = await this.startSession(request, bytes.byteLength);

    const upload = await this.doFetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "video/mp4", "Content-Length": String(bytes.byteLength) },
      body: bytes,
    });
    if (!upload.ok) await raise(this.platform, upload);

    const body = (await upload.json().catch(() => null)) as { id?: string } | null;
    if (!body?.id) throw new Error("YouTube completed the upload but returned no video id");
    return { externalId: body.id };
  }

  private async startSession(request: PublishRequest, size: number): Promise<string> {
    // The first line of the caption becomes the title, the rest the
    // description. A Short with a 2000-character title is not a thing.
    const [firstLine = "", ...rest] = request.caption.split("\n");
    const title = (firstLine.trim() || "Untitled").slice(0, MAX_TITLE);

    const response = await this.doFetch(`${UPLOAD}?uploadType=resumable&part=snippet,status`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${request.accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Length": String(size),
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify({
        snippet: { title, description: rest.join("\n").slice(0, MAX_DESCRIPTION) },
        status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
      }),
    });
    if (!response.ok) await raise(this.platform, response);

    const uploadUrl = response.headers.get("location");
    if (!uploadUrl) throw new Error("YouTube did not return a resumable upload URL");
    return uploadUrl;
  }
}
