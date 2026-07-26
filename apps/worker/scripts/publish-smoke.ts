/**
 * Behaviour checks for the platform publishers. Each platform is driven against
 * a stub server, so the protocol differences (pull-from-url, container polling,
 * resumable upload) are asserted rather than assumed.
 *
 *   tsx scripts/publish-smoke.ts
 */
import { FacebookPublisher } from "../src/lib/platforms/facebook";
import { InstagramPublisher } from "../src/lib/platforms/instagram";
import { TikTokPublisher } from "../src/lib/platforms/tiktok";
import { YouTubePublisher } from "../src/lib/platforms/youtube";
import { PermanentPublishError, isPermanentStatus } from "../src/lib/platforms/types";
import { composeCaption } from "../src/lib/publish";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

interface Call {
  url: string;
  method: string;
  body: string;
}

/** Fetch stub that records calls and replies from a scripted queue. */
function stub(replies: (() => Response)[]): {
  fetch: typeof globalThis.fetch;
  calls: Call[];
} {
  const calls: Call[] = [];
  let index = 0;
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method ?? "GET",
      body: String(init?.body ?? ""),
    });
    const reply = replies[Math.min(index, replies.length - 1)];
    index += 1;
    return reply ? reply() : new Response("{}", { status: 200 });
  }) as typeof globalThis.fetch;
  return { fetch: fetchImpl, calls };
}

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

const REQUEST = {
  videoUrl: "https://cdn.test/render.mp4",
  caption: "A caption",
  accessToken: "token",
  accountId: "acct_1",
};

async function main(): Promise<void> {
  // Retry classification. Getting this wrong means either five pointless
  // retries against a revoked token, or giving up on a transient blip.
  check("400 is permanent", isPermanentStatus(400));
  check("401 is permanent", isPermanentStatus(401));
  check("403 is permanent", isPermanentStatus(403));
  check("422 is permanent", isPermanentStatus(422));
  check("429 is retryable", !isPermanentStatus(429));
  check("500 is retryable", !isPermanentStatus(500));
  check("503 is retryable", !isPermanentStatus(503));

  // Captions and hashtags are stored apart but must arrive together.
  check("joins caption and hashtags", composeCaption("Hi", "#a #b") === "Hi\n\n#a #b");
  check("omits the gap with no hashtags", composeCaption("Hi", "  ") === "Hi");
  check("trims a blank caption", composeCaption("  ", "#a") === "#a");

  // TikTok: pull-from-url, and a 200 carrying an error object is still a failure.
  {
    const s = stub([() => json({ data: { publish_id: "pub_1" } })]);
    const outcome = await new TikTokPublisher(s.fetch).publish(REQUEST);
    check("tiktok returns the publish id", outcome.externalId === "pub_1");
    check("tiktok sends PULL_FROM_URL", s.calls[0]?.body.includes("PULL_FROM_URL") ?? false);
    check("tiktok sends the video url", s.calls[0]?.body.includes(REQUEST.videoUrl) ?? false);
  }
  {
    const s = stub([() => json({ error: { code: "spam_risk", message: "no" } })]);
    let permanent = false;
    try {
      await new TikTokPublisher(s.fetch).publish(REQUEST);
    } catch (error) {
      permanent = error instanceof PermanentPublishError;
    }
    check("tiktok treats a 200-with-error as a failure", permanent);
  }
  {
    const s = stub([() => json({ error: "nope" }, 401)]);
    let permanent = false;
    try {
      await new TikTokPublisher(s.fetch).publish(REQUEST);
    } catch (error) {
      permanent = error instanceof PermanentPublishError;
    }
    check("tiktok maps 401 to a permanent failure", permanent);
  }

  // Instagram: create container, wait for FINISHED, then publish.
  {
    const s = stub([
      () => json({ id: "container_1" }),
      () => json({ status_code: "IN_PROGRESS" }),
      () => json({ status_code: "FINISHED" }),
      () => json({ id: "post_1" }),
    ]);
    const outcome = await new InstagramPublisher(s.fetch, () => Promise.resolve()).publish(REQUEST);
    check("instagram returns the post id", outcome.externalId === "post_1");
    check("instagram creates a REELS container", s.calls[0]?.body.includes("REELS") ?? false);
    check("instagram waits for encoding", s.calls.length === 4, `${s.calls.length} calls`);
    // Publishing to /me posts nowhere useful; it must address the IG account.
    check(
      "instagram publishes to the account, not /me",
      (s.calls[3]?.url.includes("/acct_1/media_publish") ?? false) &&
        !(s.calls[3]?.url.includes("/me/") ?? false),
      s.calls[3]?.url ?? "",
    );
  }
  {
    const s = stub([
      () => json({ id: "c" }),
      () => json({ status_code: "ERROR", status: "bad codec" }),
    ]);
    let message = "";
    let permanent = false;
    try {
      await new InstagramPublisher(s.fetch, () => Promise.resolve()).publish(REQUEST);
    } catch (error) {
      permanent = error instanceof PermanentPublishError;
      message = error instanceof Error ? error.message : "";
    }
    check("instagram surfaces an encoding failure as permanent", permanent);
    check("instagram explains why", message.includes("bad codec"), message);
  }

  // Facebook: single call to the video edge on the video host.
  {
    const s = stub([() => json({ id: "vid_1" })]);
    const outcome = await new FacebookPublisher(s.fetch).publish(REQUEST);
    check("facebook returns the video id", outcome.externalId === "vid_1");
    check("facebook uses the video host", s.calls[0]?.url.includes("graph-video.") ?? false);
    check("facebook posts to the page", s.calls[0]?.url.includes("/acct_1/videos") ?? false);
  }

  // YouTube: fetch the bytes, start a resumable session, PUT the bytes.
  {
    const s = stub([
      () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
      () => new Response("", { status: 200, headers: { location: "https://upload.test/session" } }),
      () => json({ id: "yt_1" }),
    ]);
    const outcome = await new YouTubePublisher(s.fetch).publish({
      ...REQUEST,
      caption: "The title line\nand the description",
    });
    check("youtube returns the video id", outcome.externalId === "yt_1");
    check(
      "youtube starts a resumable session",
      s.calls[1]?.url.includes("uploadType=resumable") ?? false,
    );
    // The first line becomes the title; a 2000-character title is not a thing.
    check(
      "youtube splits title from description",
      (s.calls[1]?.body.includes('"title":"The title line"') ?? false) &&
        (s.calls[1]?.body.includes("and the description") ?? false),
    );
    check("youtube PUTs to the session url", s.calls[2]?.url === "https://upload.test/session");
    check("youtube uploads with PUT", s.calls[2]?.method === "PUT");
  }
  {
    const s = stub([
      () => new Response(new Uint8Array([1]), { status: 200 }),
      () => new Response("", { status: 200 }),
    ]);
    let threw = false;
    try {
      await new YouTubePublisher(s.fetch).publish(REQUEST);
    } catch {
      threw = true;
    }
    check("youtube fails without a session url", threw);
  }

  process.stdout.write(
    `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
  );
  if (failures > 0) process.exit(1);
}

void main();
