import { raise, type PlatformPublisher, type PublishRequest, type PublishOutcome } from "./types";

/**
 * TikTok Content Posting API.
 *
 * TikTok pulls the file itself from a URL we hand it, which means the render
 * must be publicly reachable and the domain must be verified with TikTok before
 * PULL_FROM_URL is allowed. Direct Post publishes straight to the profile.
 */
const INIT = "https://open.tiktokapis.com/v2/post/publish/video/init/";

interface InitResponse {
  data?: { publish_id?: string };
  error?: { code?: string; message?: string };
}

export class TikTokPublisher implements PlatformPublisher {
  readonly platform = "tiktok";

  constructor(private readonly doFetch: typeof globalThis.fetch = globalThis.fetch) {}

  async publish(request: PublishRequest): Promise<PublishOutcome> {
    const response = await this.doFetch(INIT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${request.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          // TikTok caps the title; sending more is rejected outright rather
          // than truncated, so it is trimmed here.
          title: request.caption.slice(0, 2200),
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_comment: false,
        },
        source_info: { source: "PULL_FROM_URL", video_url: request.videoUrl },
      }),
    });

    if (!response.ok) await raise(this.platform, response);

    const body = (await response.json().catch(() => null)) as InitResponse | null;
    // TikTok returns 200 with an error object for business-rule failures, so a
    // successful status is not on its own a successful post.
    if (body?.error?.code && body.error.code !== "ok") {
      await raise(this.platform, new Response(JSON.stringify(body.error), { status: 400 }));
    }

    const publishId = body?.data?.publish_id;
    if (!publishId) throw new Error("TikTok accepted the post but returned no publish id");
    return { externalId: publishId };
  }
}
