/**
 * The sending port.
 *
 * One implementation per provider. The service never talks to a provider SDK
 * directly, so swapping vendors is one file and the idempotency guarantee in
 * the processor stays where it is.
 */

export interface SendRequest {
  readonly to: string;
  /** Overrides the configured sender. Omitted for ordinary transactional mail. */
  readonly from?: string;
  readonly subject: string;
  /** Plain text. Nothing here renders HTML, so nothing here can inject it. */
  readonly text: string;
}

export interface SendOutcome {
  /** The provider's id for the accepted message, stored for later reference. */
  readonly providerMessageId: string;
}

export interface MailProvider {
  readonly name: string;
  send(request: SendRequest): Promise<SendOutcome>;
}

/**
 * A failure that will never succeed on retry: a rejected address, a malformed
 * payload, a revoked key. The consumer stops retrying when it sees this.
 */
export class PermanentSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentSendError";
  }
}

/**
 * The service is not configured to send at all.
 *
 * Distinct from a permanent failure because it is not the delivery's fault and
 * it is not permanent for the system: the moment a key exists these become
 * sendable. The delivery is parked as blocked so the backlog is visible and
 * replayable, rather than burned as failed or, far worse, reported as sent.
 */
export class SendBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SendBlockedError";
  }
}

/** HTTP statuses that mean "this will not work no matter how often you ask". */
export function isPermanentStatus(status: number): boolean {
  return status === 400 || status === 401 || status === 403 || status === 404 || status === 422;
}

/** Throws the right error class for a failed provider response. */
export async function raise(provider: string, response: Response): Promise<never> {
  const detail = (await response.text().catch(() => "")).slice(0, 300) || `HTTP ${response.status}`;
  const message = `${provider} rejected the message (${response.status}): ${detail}`;
  if (isPermanentStatus(response.status)) throw new PermanentSendError(message);
  throw new Error(message);
}
