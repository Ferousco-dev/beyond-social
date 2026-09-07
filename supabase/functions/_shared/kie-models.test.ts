import { buildMarketInput, UnsupportedModelError } from "./kie-models.ts";

/**
 * The field names, checked against the documentation they came from.
 *
 * Every model on `/jobs/createTask` names its inputs differently, and a name
 * that is wrong is not an error: the provider accepts the request, starts the
 * task, takes the credit, and leaves out the footage or the photo the person
 * attached. There is nothing in the response to notice, which is why this is
 * asserted here rather than discovered in a video somebody paid for.
 *
 * The expectations below are transcribed from each model's own page on
 * docs.kie.ai. If one of them is edited to make a test pass, the documentation
 * is what to check first.
 *
 * Run with: deno run --allow-read supabase/functions/_shared/kie-models.test.ts
 */

const base = {
  prompt: "a cat",
  imageUrls: [] as string[],
  videoUrls: [] as string[],
  aspectRatio: "9:16",
  duration: 6,
  shots: [],
};
const V = "https://x/v.mp4",
  I = "https://x/i.png";
let pass = 0,
  fail = 0;
function check(name: string, got: unknown, want: unknown) {
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
function throws(name: string, fn: () => void) {
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

check(
  "2-6 restyle uses video_urls array + string duration",
  buildMarketInput("wan/2-6-video-to-video", { ...base, videoUrls: [V] }),
  { prompt: "a cat", video_urls: [V], duration: "5" },
);

check(
  "2-6 snaps a long request to 10",
  buildMarketInput("wan/2-6-video-to-video", { ...base, videoUrls: [V], duration: 9 }),
  { prompt: "a cat", video_urls: [V], duration: "10" },
);

check(
  "videoedit uses singular video_url and reference_image",
  buildMarketInput("wan/2-7-videoedit", { ...base, videoUrls: [V], imageUrls: [I] }),
  { video_url: V, prompt: "a cat", reference_image: I, aspect_ratio: "9:16", duration: 0 },
);

check(
  "r2v splits stills and footage, numeric duration",
  buildMarketInput("wan/2-7-r2v", { ...base, imageUrls: [I], videoUrls: [V] }),
  {
    prompt: "a cat",
    reference_image: [I],
    reference_video: [V],
    aspect_ratio: "9:16",
    duration: 6,
  },
);

check(
  "gemini uses image_urls and a STRING duration",
  buildMarketInput("gemini-omni-video", { ...base, imageUrls: [I] }),
  { prompt: "a cat", image_urls: [I], duration: "6", aspect_ratio: "9:16" },
);

check(
  "gemini drops footage when the 7 unit quota has no room",
  buildMarketInput("gemini-omni-video", { ...base, imageUrls: Array(7).fill(I), videoUrls: [V] }),
  { prompt: "a cat", image_urls: Array(7).fill(I), duration: "6", aspect_ratio: "9:16" },
);

check(
  "gemini sends video_list objects when there is room",
  buildMarketInput("gemini-omni-video", { ...base, videoUrls: [V] }),
  {
    prompt: "a cat",
    video_list: [{ url: V, start: 0, ends: 10 }],
    duration: "6",
    aspect_ratio: "9:16",
  },
);

check(
  "gemini refuses an unsupported ratio rather than inventing one",
  buildMarketInput("gemini-omni-video", { ...base, aspectRatio: "1:1" }),
  { prompt: "a cat", duration: "6" },
);

throws("videoedit without footage", () => buildMarketInput("wan/2-7-videoedit", base));
throws("r2v with no references at all", () => buildMarketInput("wan/2-7-r2v", base));
throws("restyle without footage", () => buildMarketInput("wan/2-6-video-to-video", base));
throws("an unknown model is still refused", () => buildMarketInput("made/up", base));

console.log(`\n${pass}/${pass + fail} passed`);
if (fail > 0) Deno.exit(1);
