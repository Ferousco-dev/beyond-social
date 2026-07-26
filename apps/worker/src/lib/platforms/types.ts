/**
 * The publishing port.
 *
 * Every platform gets one implementation. They differ more than they look:
 * TikTok and Instagram pull the file from a URL we give them, YouTube wants the
 * bytes uploaded to it, and each reports completion differently. Hiding that
 * behind one interface is what keeps the worker free of platform branching.
 */

export interface PublishRequest {
  /** Publicly reachable URL of the finished render. */
  readonly videoUrl: string;
  readonly caption: string;
  readonly accessToken: string;
  /** The platform's id for the target account, page, or channel. */
  readonly accountId: string;
}

export interface PublishOutcome {
  /** The platform's id for the created post, stored for later reference. */
  readonly externalId: string;
}

export interface PlatformPublisher {
  readonly platform: string;
  publish(request: PublishRequest): Promise<PublishOutcome>;
}

/**
 * A failure that will never succeed on retry: a revoked token, a rejected
 * video, a missing permission. The worker stops retrying when it sees this,
 * because five exponential retries against a permanent error only delays the
 * moment the user is told something is wrong.
 */
export class PermanentPublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentPublishError";
  }
}

/** HTTP statuses that mean "this will not work no matter how often you ask". */
export function isPermanentStatus(status: number): boolean {
  return status === 400 || status === 401 || status === 403 || status === 404 || status === 422;
}

export async function readError(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  return text.slice(0, 300) || `HTTP ${response.status}`;
}

/** Throws the right error class for a failed platform response. */
export async function raise(platform: string, response: Response): Promise<never> {
  const detail = await readError(response);
  const message = `${platform} rejected the post (${response.status}): ${detail}`;
  if (isPermanentStatus(response.status)) throw new PermanentPublishError(message);
  throw new Error(message);
}
