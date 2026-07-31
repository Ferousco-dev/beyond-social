import { env } from "../../config/env";
import { logger } from "../logger";
import { ResendProvider } from "./resend";
import { type MailProvider } from "./types";

/**
 * Builds the configured provider.
 *
 * The missing-key case is announced once at startup rather than only at the
 * first send, so the operator learns the service cannot deliver before a user
 * does. The provider still refuses per send; this is the warning, not the guard.
 */
export function createProvider(): MailProvider {
  if (!env.MAIL_PROVIDER_API_KEY) {
    logger.warn(
      "No mail provider API key configured. Every delivery will be marked blocked until MAIL_PROVIDER_API_KEY and MAIL_FROM are set.",
    );
  }
  return new ResendProvider(env.MAIL_PROVIDER_API_KEY, env.MAIL_FROM);
}

export { PermanentSendError, SendBlockedError } from "./types";
export type { MailProvider, SendRequest, SendOutcome } from "./types";
