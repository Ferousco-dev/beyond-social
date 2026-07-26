import { PermanentPublishError, publisherFor } from "./platforms";
import { createServiceClient } from "./supabase";

export interface PublishInput {
  userId: string;
  platform: string;
  caption: string;
  hashtags: string;
  videoUrl: string | null;
}

export interface PublishResult {
  externalId: string;
}

interface ConnectionRow {
  access_token: string;
  external_account_id: string;
  expires_at: string | null;
  revoked_at: string | null;
}

/** Hashtags are stored separately but every platform wants them in the caption. */
export function composeCaption(caption: string, hashtags: string): string {
  const tags = hashtags.trim();
  if (!tags) return caption.trim();
  return `${caption.trim()}\n\n${tags}`.trim();
}

/**
 * Publishes one post to one platform.
 *
 * Fails closed at every missing precondition. A post that cannot actually be
 * delivered must surface as failed, never as published, because a false
 * "published" is worse than an error: the user believes their content went out.
 */
export async function publishPost(input: PublishInput): Promise<PublishResult> {
  const publisher = publisherFor(input.platform);
  if (!publisher) {
    throw new PermanentPublishError(`${input.platform} is not a supported platform`);
  }
  if (!input.videoUrl) {
    throw new PermanentPublishError("The post has no finished video to publish");
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("social_connections")
    .select("access_token, external_account_id, expires_at, revoked_at")
    .eq("user_id", input.userId)
    .eq("platform", input.platform)
    .maybeSingle();

  if (error) throw new Error(`Could not read the ${input.platform} connection: ${error.message}`);

  const connection = data as ConnectionRow | null;
  if (!connection || connection.revoked_at || !connection.access_token) {
    throw new PermanentPublishError(
      `No connected ${input.platform} account. Reconnect it in Settings, then reschedule.`,
    );
  }
  // Checked here rather than left to the platform, so the user gets a message
  // that says what to do instead of a raw 401.
  if (connection.expires_at && new Date(connection.expires_at) <= new Date()) {
    throw new PermanentPublishError(
      `The ${input.platform} connection has expired. Reconnect it in Settings.`,
    );
  }

  return publisher.publish({
    videoUrl: input.videoUrl,
    caption: composeCaption(input.caption, input.hashtags),
    accessToken: connection.access_token,
    accountId: connection.external_account_id,
  });
}
