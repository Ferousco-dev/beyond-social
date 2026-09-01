import { logger } from "./logger";
import { PermanentPublishError, publisherFor } from "./platforms";
import { canRefresh, refreshAccessTokenOnce } from "./social-refresh";
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
  refresh_token: string | null;
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
    .select("access_token, refresh_token, external_account_id, expires_at, revoked_at")
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

  let accessToken = connection.access_token;

  // Checked here rather than left to the platform, so the user gets a message
  // that says what to do instead of a raw 401. An expired token with a
  // refresh token on file is not a dead connection, only a stale one: renew
  // it before falling back to asking the user to reconnect by hand.
  if (connection.expires_at && new Date(connection.expires_at) <= new Date()) {
    if (!connection.refresh_token || !canRefresh(input.platform)) {
      throw new PermanentPublishError(
        `The ${input.platform} connection has expired. Reconnect it in Settings.`,
      );
    }

    let refreshed;
    try {
      refreshed = await refreshAccessTokenOnce(
        `${input.userId}:${input.platform}`,
        input.platform,
        connection.refresh_token,
      );
    } catch {
      // The token that was actually revoked, or a refresh token the provider
      // has invalidated, looks identical to a transient network failure from
      // here. Marking it revoked and asking to reconnect is the safer of the
      // two wrong guesses: a real transient failure retries on the next
      // scheduled post anyway, while an actually-dead connection that keeps
      // getting silently retried never resolves itself.
      await supabase
        .from("social_connections")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", input.userId)
        .eq("platform", input.platform);
      throw new PermanentPublishError(
        `The ${input.platform} connection could not be renewed. Reconnect it in Settings.`,
      );
    }

    accessToken = refreshed.accessToken;

    // Persisting is best-effort and deliberately outside the try above: the
    // refresh itself already succeeded and this publish can proceed on the
    // token now in hand regardless of whether the write lands. A failed
    // write only costs the next run a redundant refresh, not this one a
    // failed post, and it must not be mistaken for the refresh itself
    // failing, which is a materially different, worse fact about the
    // connection.
    const { error: updateError } = await supabase
      .from("social_connections")
      .update({
        access_token: refreshed.accessToken,
        refresh_token: refreshed.refreshToken,
        expires_at: refreshed.expiresAt?.toISOString() ?? null,
      })
      .eq("user_id", input.userId)
      .eq("platform", input.platform);
    if (updateError) {
      logger.warn("could not persist a refreshed social token", {
        platform: input.platform,
        userId: input.userId,
        error: updateError.message,
      });
    }
  }

  return publisher.publish({
    videoUrl: input.videoUrl,
    caption: composeCaption(input.caption, input.hashtags),
    accessToken,
    accountId: connection.external_account_id,
  });
}
