import { raise, type PlatformPublisher, type PublishRequest, type PublishOutcome } from "./types";

/**
 * Facebook Page video posts.
 *
 * Videos go to the Page's video edge on the dedicated upload host, and the Page
 * access token is what authorises it. `file_url` lets Facebook fetch the render
 * rather than us streaming the bytes twice.
 */
const VIDEO_HOST = "https://graph-video.facebook.com/v21.0";

export class FacebookPublisher implements PlatformPublisher {
  readonly platform = "facebook";

  constructor(private readonly doFetch: typeof globalThis.fetch = globalThis.fetch) {}

  async publish(request: PublishRequest): Promise<PublishOutcome> {
    const response = await this.doFetch(`${VIDEO_HOST}/${request.accountId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_url: request.videoUrl,
        description: request.caption,
        access_token: request.accessToken,
      }),
    });
    if (!response.ok) await raise(this.platform, response);

    const body = (await response.json().catch(() => null)) as { id?: string } | null;
    if (!body?.id) throw new Error("Facebook accepted the video but returned no post id");
    return { externalId: body.id };
  }
}
