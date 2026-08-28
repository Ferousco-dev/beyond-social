import { z } from "zod";

import { PermanentSendError } from "./providers";
import { createServiceClient } from "./supabase";

/** Placeholder values are scalars: a template renders text, not a document. */
export const mailPayloadSchema = z.record(z.union([z.string(), z.number(), z.boolean()]));

export type MailPayload = z.infer<typeof mailPayloadSchema>;

/**
 * Validates a delivery's stored payload, or throws a permanent error.
 *
 * A payload shaped wrong (a nested object, an array) is the same class of
 * problem `interpolate` below throws `PermanentSendError` for: the retry that
 * would fix a transient fault cannot fix a payload that was wrong when it was
 * written.
 */
export function parsePayload(payload: unknown): MailPayload {
  const result = mailPayloadSchema.safeParse(payload ?? {});
  if (!result.success) {
    throw new PermanentSendError(
      `The payload does not match the expected shape: ${result.error.message}`,
    );
  }
  return result.data;
}

const templateRowSchema = z.object({
  key: z.string(),
  subject: z.string(),
  body: z.string(),
});

export interface RenderedMail {
  readonly subject: string;
  readonly text: string;
}

const PLACEHOLDER = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

/**
 * Substitutes {{placeholders}} from the payload.
 *
 * A missing value is a permanent error rather than an empty string, because an
 * email that reads "Hi ," has already been sent by the time anyone notices, and
 * the retry that would fix a transient fault cannot fix a wrong payload.
 */
function interpolate(template: string, payload: MailPayload, where: string): string {
  return template.replace(PLACEHOLDER, (_match, name: string) => {
    const value = payload[name];
    if (value === undefined) {
      throw new PermanentSendError(`The ${where} needs "${name}", which the payload does not have`);
    }
    return String(value);
  });
}

/** Loads a template and renders it, or throws if the key does not exist. */
export async function renderTemplate(
  templateKey: string,
  payload: MailPayload,
): Promise<RenderedMail> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("mail_templates")
    .select("key, subject, body")
    .eq("key", templateKey)
    .maybeSingle();

  if (error) throw new Error(`Could not read the "${templateKey}" template: ${error.message}`);
  if (!data) throw new PermanentSendError(`There is no mail template called "${templateKey}"`);

  const template = templateRowSchema.parse(data);
  return {
    subject: interpolate(template.subject, payload, "subject"),
    text: interpolate(template.body, payload, "body"),
  };
}
