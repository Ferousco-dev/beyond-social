import { FacebookPublisher } from "./facebook";
import { InstagramPublisher } from "./instagram";
import { TikTokPublisher } from "./tiktok";
import { YouTubePublisher } from "./youtube";
import { type PlatformPublisher } from "./types";

const PUBLISHERS: Readonly<Record<string, PlatformPublisher>> = {
  tiktok: new TikTokPublisher(),
  instagram: new InstagramPublisher(),
  facebook: new FacebookPublisher(),
  youtube: new YouTubePublisher(),
};

/** Returns the publisher for a platform, or undefined if we do not support it. */
export function publisherFor(platform: string): PlatformPublisher | undefined {
  return PUBLISHERS[platform];
}

export { PermanentPublishError } from "./types";
export type { PlatformPublisher, PublishRequest, PublishOutcome } from "./types";
