import {
  buildAvatarInput,
  isAvatarModelSupported,
  UnsupportedModelError,
} from "./kie-avatars/index.ts";

/**
 * The avatar field names, checked against the documentation they came from.
 *
 * Same rule as the video builders: a wrong field name is not an error, it is
 * a silently missing input on a video the user paid for. Every expectation
 * below is transcribed from the model's own page on docs.kie.ai. If one of
 * them is edited to make a test pass, the documentation is what to check first.
 *
 * Run with: deno run --allow-read supabase/functions/_shared/kie-avatars.test.ts
 */

let pass = 0,
  fail = 0;
function eq(name: string, got: unknown, want: unknown): void {
  const a = JSON.stringify(got),
    b = JSON.stringify(want);
  if (a === b) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name, "\n  got  ", a, "\n  want ", b);
  }
}
function throws(name: string, fn: () => void): void {
  try {
    fn();
    fail++;
    console.log("FAIL", name, "(did not throw)");
  } catch (e) {
    if (e instanceof UnsupportedModelError) {
      pass++;
      console.log("PASS", name);
    } else {
      fail++;
      console.log("FAIL", name, e);
    }
  }
}

const req = {
  imageUrl: "https://x/p.png",
  audioUrl: "https://x/a.mp3",
  prompt: "hello",
  resolution: "720p",
};

eq(
  "kling standard sends image_url + audio_url + prompt, no resolution",
  buildAvatarInput("kling/ai-avatar-standard", req),
  { image_url: req.imageUrl, audio_url: req.audioUrl, prompt: req.prompt },
);

eq("kling pro sends the same shape as standard", buildAvatarInput("kling/ai-avatar-pro", req), {
  image_url: req.imageUrl,
  audio_url: req.audioUrl,
  prompt: req.prompt,
});

eq("infinitalk sends resolution suffixed with p", buildAvatarInput("infinitalk/from-audio", req), {
  image_url: req.imageUrl,
  audio_url: req.audioUrl,
  prompt: req.prompt,
  resolution: "720p",
});

eq(
  "infinitalk snaps 1080p down to 480p, which it cannot render",
  buildAvatarInput("infinitalk/from-audio", { ...req, resolution: "1080p" }),
  { image_url: req.imageUrl, audio_url: req.audioUrl, prompt: req.prompt, resolution: "480p" },
);

eq(
  "omnihuman uses output_resolution and values WITHOUT p",
  buildAvatarInput("omnihuman-1-5", { ...req, resolution: "1080p" }),
  {
    image_url: req.imageUrl,
    audio_url: req.audioUrl,
    prompt: req.prompt,
    output_resolution: "1080",
  },
);

eq(
  "omnihuman raises 480p to 720 (480 is not a documented option)",
  buildAvatarInput("omnihuman-1-5", { ...req, resolution: "480p" }),
  {
    image_url: req.imageUrl,
    audio_url: req.audioUrl,
    prompt: req.prompt,
    output_resolution: "720",
  },
);

eq(
  "omnihuman drops an empty prompt so it stays optional",
  buildAvatarInput("omnihuman-1-5", { ...req, prompt: "" }),
  { image_url: req.imageUrl, audio_url: req.audioUrl, output_resolution: "720" },
);

throws("volcengine is refused, not silently misused as photo+audio", () =>
  buildAvatarInput("volcengine/video-to-video-lip-sync", req),
);

throws("an unknown avatar model is refused", () => buildAvatarInput("made/up-avatar", req));

eq(
  "isAvatarModelSupported reports the four that have builders",
  [
    "kling/ai-avatar-standard",
    "kling/ai-avatar-pro",
    "infinitalk/from-audio",
    "omnihuman-1-5",
    "volcengine/video-to-video-lip-sync",
    "made-up",
  ].map(isAvatarModelSupported),
  [true, true, true, true, false, false],
);

console.log(`\n${pass}/${pass + fail} passed`);
if (fail > 0) Deno.exit(1);
