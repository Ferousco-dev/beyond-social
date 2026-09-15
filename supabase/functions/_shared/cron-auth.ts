// Shared secret check for scheduled jobs, same rule as the web app's
// lib/cron/auth.ts: an unset secret closes the endpoint rather than opening
// it to every caller that also sends nothing.
//
// Two names are accepted because two different schedulers call these
// endpoints with two different credentials by design, not by accident.
// CRON_SECRET is what Vercel's own cron routes forward (the poll-heygen
// fallback route, and the in-app "check now" button), already shared with
// every other scheduled route in the app. HEYGEN_CRON_SECRET is a second,
// independent credential for Postgres's own pg_cron schedule (see migration
// 0110), so that giving the database a secret it can call these functions
// with never means rotating the one the rest of the app already depends on.
export function isCronRequestAuthorised(request: Request): boolean {
  const provided = request.headers.get("x-cron-secret") ?? "";
  if (provided === "") return false;

  const appSecret = Deno.env.get("CRON_SECRET") ?? "";
  const dbSecret = Deno.env.get("HEYGEN_CRON_SECRET") ?? "";

  return (appSecret !== "" && provided === appSecret) || (dbSecret !== "" && provided === dbSecret);
}
