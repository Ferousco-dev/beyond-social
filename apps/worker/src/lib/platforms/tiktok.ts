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
    /*
     * TikTok returns 200 with an error object for business-rule failures, so a
     * successful status is not on its own a successful post.
     *
     * This used to synthesize a 400 and hand it to `raise`, which treats every
     * 400 as permanent. That is right for a token TikTok has rejected outright,
     * but TikTok's own business-rule codes include ones that are ordinary and
     * retryable, a transient rate limit, a pull-from-URL that has not caught up
     * with the render yet, and there is no reliable HTTP status here to tell
     * them apart by: they are all 200 with a different string in `error.code`.
     * Treating an unrecognised code as permanent risks giving up on something
     * that would have succeeded on the next attempt, which costs the user a
     * post that never goes out; treating it as retryable costs, at most, the
     * few minutes BullMQ takes to exhaust its retries before failing anyway.
     * That is the safer side to be wrong on, so an unrecognised code retries.
     */
    if (body?.error?.code && body.error.code !== "ok") {
      const { code, message } = body.error;
      throw new Error(`tiktok rejected the post (${code}): ${message ?? "no detail given"}`);
    }

    const publishId = body?.data?.publish_id;
    if (!publishId) throw new Error("TikTok accepted the post but returned no publish id");
    return { externalId: publishId };
  }
}
