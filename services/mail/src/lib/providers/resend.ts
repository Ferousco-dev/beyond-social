import {
  raise,
  SendBlockedError,
  type MailProvider,
  type SendOutcome,
  type SendRequest,
} from "./types";

const ENDPOINT = "https://api.resend.com/emails";

interface ResendResponse {
  id?: string;
}

/**
 * Resend's transactional API.
 *
 * There are no mail credentials yet, so the shipped behaviour of this adapter
 * is to refuse. It fails closed on an empty key instead of logging the message
 * and returning a fake id, because a delivery row marked sent for an email
 * nobody received is a lie the rest of the system would then trust.
 */
export class ResendProvider implements MailProvider {
  readonly name = "resend";

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly doFetch: typeof globalThis.fetch = globalThis.fetch,
  ) {}

  async send(request: SendRequest): Promise<SendOutcome> {
    if (!this.apiKey) {
      throw new SendBlockedError(
        "No MAIL_PROVIDER_API_KEY is configured, so nothing can be sent. The delivery is parked as blocked.",
      );
    }
    if (!this.from && !request.from) {
      throw new SendBlockedError(
        "No MAIL_FROM is configured, so there is no verified sender to send from.",
      );
    }

    const response = await this.doFetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: request.from || this.from,
        to: [request.to],
        subject: request.subject,
        text: request.text,
      }),
    });

    if (!response.ok) await raise(this.name, response);

    const body = (await response.json().catch(() => null)) as ResendResponse | null;
    // Without an id there is nothing to reconcile a bounce or a duplicate
    // against later, so an accepted response that omits it is still a failure.
    if (!body?.id) throw new Error("Resend accepted the message but returned no id");
    return { providerMessageId: body.id };
  }
}
