import { type ManagedSecret } from "./types";

/**
 * UTC like every other timestamp in the console, so an operator comparing a
 * rotation against an audit line or a provider dashboard reads one clock.
 */
const TIMESTAMP = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function formatRotatedAt(value: string | null): string {
  if (!value) return "Never rotated through this console";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Rotation time could not be read";
  return `${TIMESTAMP.format(parsed)} UTC`;
}

export function formatRotatedBy(email: string | null): string {
  return email ?? "nobody yet";
}

/**
 * How the tail is shown.
 *
 * The dots are not a redaction of something the page holds back: the four
 * characters are the only part of the value that ever leaves the database. They
 * exist so an operator can match a row against the key their provider console
 * shows, which is the one check that catches a secret set in the wrong project.
 */
export function formatTail(secret: ManagedSecret): string {
  return secret.lastFour ? `•••• ${secret.lastFour}` : "Not set";
}
