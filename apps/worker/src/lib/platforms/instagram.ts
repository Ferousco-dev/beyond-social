import {
  raise,
  PermanentPublishError,
  type PlatformPublisher,
  type PublishRequest,
  type PublishOutcome,
} from "./types";

/**
 * Instagram Reels via the Graph API.
 *
 * Two steps: create a media container pointing at the video URL, then publish
 * it. The container is not ready immediately, so publishing has to wait for
 * FINISHED; publishing early fails with a misleading error.
 */
const GRAPH = "https://graph.facebook.com/v21.0";

/** Instagram encodes a Reel of any normal length well within this window. */
const MAX_WAIT_MS = 5 * 60_000;
const POLL_INTERVAL_MS = 5_000;

export class InstagramPublisher implements PlatformPublisher {
  readonly platform = "instagram";

  constructor(
    private readonly doFetch: typeof globalThis.fetch = globalThis.fetch,
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {}

  async publish(request: PublishRequest): Promise<PublishOutcome> {
    const containerId = await this.createContainer(request);
    await this.waitUntilReady(containerId, request.accessToken);
    return {
      externalId: await this.publishContainer(request.accountId, containerId, request.accessToken),
    };
  }

  private async createContainer(request: PublishRequest): Promise<string> {
    const response = await this.doFetch(`${GRAPH}/${request.accountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: request.videoUrl,
        caption: request.caption.slice(0, 2200),
        access_token: request.accessToken,
      }),
    });
    if (!response.ok) await raise(this.platform, response);

    const body = (await response.json().catch(() => null)) as { id?: string } | null;
    if (!body?.id) throw new Error("Instagram returned no media container id");
    return body.id;
  }

  /** Polls until the container finishes encoding, or gives up with a clear reason. */
  private async waitUntilReady(containerId: string, token: string): Promise<void> {
    const deadline = Date.now() + MAX_WAIT_MS;

    while (Date.now() < deadline) {
      const response = await this.doFetch(
        `${GRAPH}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`,
      );
      if (!response.ok) await raise(this.platform, response);

      const body = (await response.json().catch(() => null)) as {
        status_code?: string;
        status?: string;
      } | null;

      if (body?.status_code === "FINISHED") return;
      if (body?.status_code === "ERROR") {
        throw new PermanentPublishError(
          `Instagram could not process the video: ${body.status ?? "unknown error"}`,
        );
      }
      await this.sleep(POLL_INTERVAL_MS);
    }

    // Not permanent: the container may still finish, and a retry re-checks it.
    throw new Error("Instagram did not finish processing the video in time");
  }

  // Publishing targets the Instagram account explicitly. `/me` resolves to the
  // authorising Facebook user, not the IG business account, and silently posts
  // nowhere useful.
  private async publishContainer(
    accountId: string,
    containerId: string,
    token: string,
  ): Promise<string> {
    const response = await this.doFetch(`${GRAPH}/${accountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerId, access_token: token }),
    });
    if (!response.ok) await raise(this.platform, response);

    const body = (await response.json().catch(() => null)) as { id?: string } | null;
    if (!body?.id) throw new Error("Instagram published but returned no post id");
    return body.id;
  }
}
