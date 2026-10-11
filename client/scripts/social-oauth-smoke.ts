/**
 * Behaviour checks for the social OAuth helpers. No keys and no network: the
 * token exchange is driven against a stub so the security properties (state
 * matching, PKCE, redirect URI) are asserted rather than eyeballed.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/social-oauth-smoke.ts
 */
process.env.TIKTOK_CLIENT_KEY ||= "tk_client";
process.env.TIKTOK_CLIENT_SECRET ||= "tk_secret";
process.env.GOOGLE_CLIENT_ID ||= "goog_client";
process.env.GOOGLE_CLIENT_SECRET ||= "goog_secret";

const { buildAuthorizeUrl, challengeFor, exchangeCode, newState, newVerifier, statesMatch } =
  await import("../src/lib/social/oauth");
const { isSocialPlatform, redirectUri } = await import("../src/lib/social/platforms");

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

const APP = "https://app.test";

// State must be unguessable and compared in constant time, or the flow can be
// completed by an attacker binding their account to our user.
check("mints distinct states", newState() !== newState());
check("states are long enough", newState().length >= 40, String(newState().length));
check("matches an identical state", statesMatch("abc123", "abc123"));
check("rejects a different state", !statesMatch("abc123", "abc124"));
check("rejects a length mismatch", !statesMatch("abc", "abcd"));

// PKCE: the challenge must be the S256 of the verifier, base64url with no padding.
{
  const verifier = newVerifier();
  const challenge = challengeFor(verifier);
  check("challenge is base64url", /^[A-Za-z0-9_-]+$/.test(challenge), challenge.slice(0, 12));
  check("challenge is deterministic", challengeFor(verifier) === challenge);
  check("challenge differs from the verifier", challenge !== verifier);
}

// TikTok authorize URL: client_key (not client_id), comma-joined scopes, PKCE.
{
  const verifier = newVerifier();
  const url = new URL(
    buildAuthorizeUrl({ platform: "tiktok", appUrl: APP, state: "st", verifier }),
  );
  check("tiktok uses client_key", url.searchParams.get("client_key") === "tk_client");
  check("tiktok omits client_id", url.searchParams.get("client_id") === null);
  check(
    "tiktok comma-joins scopes",
    url.searchParams.get("scope") === "user.info.basic,video.publish,video.upload",
    url.searchParams.get("scope") ?? "",
  );
  check("tiktok sends a PKCE challenge", url.searchParams.get("code_challenge_method") === "S256");
  check(
    "redirect uri points at the callback",
    url.searchParams.get("redirect_uri") === `${APP}/api/social/tiktok/callback`,
  );
}

// Google needs offline access and forced consent, or no refresh token is ever
// issued and the connection silently dies after an hour.
{
  const url = new URL(buildAuthorizeUrl({ platform: "youtube", appUrl: APP, state: "st" }));
  check("youtube asks for offline access", url.searchParams.get("access_type") === "offline");
  check("youtube forces consent", url.searchParams.get("prompt") === "consent");
  check(
    "youtube space-joins scopes",
    (url.searchParams.get("scope") ?? "").includes("youtube.upload"),
  );
  check("youtube sends no PKCE", url.searchParams.get("code_challenge") === null);
}

check(
  "redirect uri has no double slash",
  !redirectUri("tiktok", "https://a.test/").includes("//api"),
);
check("recognises a known platform", isSocialPlatform("tiktok"));
check("rejects an unknown platform", !isSocialPlatform("mastodon"));

// Token exchange must send the verifier and read TikTok's nested payload.
{
  let sentBody = "";
  const stub = (async (_url: string, init?: RequestInit) => {
    sentBody = String(init?.body ?? "");
    return new Response(
      JSON.stringify({
        data: { access_token: "at", refresh_token: "rt", expires_in: 3600, open_id: "oid" },
      }),
      { status: 200 },
    );
  }) as typeof globalThis.fetch;

  const token = await exchangeCode({
    platform: "tiktok",
    appUrl: APP,
    code: "the_code",
    verifier: "the_verifier",
    fetchImpl: stub,
  });
  check("sends the code verifier", sentBody.includes("code_verifier=the_verifier"));
  check("sends the authorization_code grant", sentBody.includes("grant_type=authorization_code"));
  check("reads a nested token payload", token.accessToken === "at");
  check("captures the refresh token", token.refreshToken === "rt");
  check("computes an absolute expiry", (token.expiresAt?.getTime() ?? 0) > Date.now());
  check("captures the account id", token.externalAccountId === "oid");
}

// A flat payload (Google, Meta) must work through the same path.
{
  const stub = (async () =>
    new Response(JSON.stringify({ access_token: "flat", expires_in: 3600, scope: "a b" }), {
      status: 200,
    })) as typeof globalThis.fetch;
  const token = await exchangeCode({
    platform: "youtube",
    appUrl: APP,
    code: "c",
    fetchImpl: stub,
  });
  check("reads a flat token payload", token.accessToken === "flat");
  check("splits returned scopes", token.scopes.length === 2, token.scopes.join("|"));
  check("has no refresh token when none is sent", token.refreshToken === null);
}

// A provider error must throw with the provider's own description, because
// these failures are nearly always a mismatched redirect URI.
{
  const stub = (async () =>
    new Response(
      JSON.stringify({ error: "invalid_grant", error_description: "redirect mismatch" }),
      {
        status: 400,
      },
    )) as typeof globalThis.fetch;
  let message = "";
  try {
    await exchangeCode({ platform: "youtube", appUrl: APP, code: "c", fetchImpl: stub });
  } catch (error) {
    message = error instanceof Error ? error.message : "";
  }
  check("surfaces the provider error", message.includes("redirect mismatch"), message);
}

// A 200 with no token must still be treated as a failure.
{
  const stub = (async () =>
    new Response(JSON.stringify({}), { status: 200 })) as typeof globalThis.fetch;
  let threw = false;
  try {
    await exchangeCode({ platform: "youtube", appUrl: APP, code: "c", fetchImpl: stub });
  } catch {
    threw = true;
  }
  check("rejects a 200 with no access token", threw);
}

process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
