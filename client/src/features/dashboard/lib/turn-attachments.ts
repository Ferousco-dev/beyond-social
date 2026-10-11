import { type PendingVoice } from "../hooks/use-voice-upload";
import { type PendingPhoto } from "../components/compose-menu";

/**
 * What a turn carries, in the three shapes the send needs it in.
 *
 * Pure, and lifted out of the composer's submit handler, which had grown past
 * two hundred lines and did this assembly inline among a dozen state writes.
 * The distinction between the three is the whole reason this is worth naming:
 * they look interchangeable and are not.
 */

/** A path as it is persisted, with no signature on it. */
export interface AttachmentRef {
  kind: "photo" | "audio";
  path: string;
}

/** The same attachment with a link, for the turn drawn before the server replies. */
export interface OptimisticAttachment extends AttachmentRef {
  readonly url: string;
}

export interface TurnAttachments {
  /**
   * Paths, not URLs, are what gets persisted: a signed link expires in two
   * hours, so a thread reloaded tomorrow re-signs from these.
   *
   * Mutable because it crosses a server action boundary, and the generated
   * input type for one is not readonly.
   */
  readonly refs: AttachmentRef[];
  /**
   * The links are still fresh right now, so the optimistic turn can show what
   * was attached without waiting for the server to sign them again.
   */
  readonly optimistic: readonly OptimisticAttachment[];
  /**
   * Photo URLs alone, which is what the generator takes. Mutable for the same
   * reason as `refs`: it crosses a server action boundary.
   */
  readonly photoUrls: string[];
}

/**
 * Assembles a turn's attachments.
 *
 * `photos` is passed rather than read from state because a seeded turn carries
 * its own: they were uploaded on the previous screen and are not in the
 * composer's state yet, so reading state would send the message without them.
 */
export function turnAttachments(
  photos: readonly PendingPhoto[],
  voice: PendingVoice | null,
): TurnAttachments {
  /*
   * Settled photos only. A preview shown while its upload is still in flight
   * has no path yet, and the composer already blocks sending while one is
   * pending; this is the belt to that pair of braces, since a blob URL reaching
   * the provider would fail in a way nobody could read.
   */
  const settled = photos.filter((photo) => photo.path !== "");

  return {
    refs: [
      ...settled.map((photo) => ({ kind: "photo" as const, path: photo.path })),
      ...(voice ? [{ kind: "audio" as const, path: voice.path }] : []),
    ],
    optimistic: [
      ...settled.map((photo) => ({
        kind: "photo" as const,
        path: photo.path,
        url: photo.url,
      })),
      ...(voice ? [{ kind: "audio" as const, path: voice.path, url: voice.url }] : []),
    ],
    photoUrls: settled.map((photo) => photo.url),
  };
}
