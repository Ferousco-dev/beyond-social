/** Does a written brief become terms a platform can actually search? */
import { getJudge } from "../src/lib/prompt-engine/providers";

const SYSTEM =
  "You turn a description of a video someone wants to make into the short search terms a creator would type into TikTok.";

async function ask(prompt: string): Promise<void> {
  const reply = await getJudge().complete({
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          "Read the description and give two or three search terms that would find videos worth studying.",
          "",
          "Each term is one to three words, the kind of thing that is a real hashtag.",
          'Search for the format or the subject, not the sentence: a coffee shop brief becomes terms like "coffee shop", "cafe vlog", "small business".',
          "No hashes, no quotes, no punctuation.",
          "",
          'Respond with JSON only: {"queries":[""]}',
          "",
          `<description>\n${prompt}\n</description>`,
        ].join("\n"),
      },
    ],
    temperature: 0.2,
    json: true,
  });
  const start = reply.indexOf("{");
  const parsed = JSON.parse(reply.slice(start, reply.lastIndexOf("}") + 1)) as { queries: string[] };
  process.stdout.write(`"${prompt}"\n  -> ${parsed.queries.join(" | ")}\n`);
}

async function main(): Promise<void> {
  await ask("something for my coffee shop that makes people want to come in on a Sunday");
  await ask("I sell handmade silver rings and want to show how they are made");
  await ask("a video for my gym showing a member's 12 week transformation");
}

void main();
