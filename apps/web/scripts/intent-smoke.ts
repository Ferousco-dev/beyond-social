/**
 * Behaviour checks for intent classification. No key, no network.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/intent-smoke.ts
 *
 * These cover the path that needs no model: a bare greeting must never be
 * treated as a request for a video. Somebody typing "hello" was met with advice
 * about establishing shots, and with the classifier unreachable the fallback
 * would have spent a credit rendering it.
 */
import { classify } from "../src/lib/generation/intent";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

async function main(): Promise<void> {
  const greetings = ["hello", "Hi", "hey!", "good morning", "thanks", "gm", "ok cool", "Heyyy"];
  for (const message of greetings) {
    const { intent } = await classify(message, false);
    check(`"${message}" is small talk`, intent === "chat", intent);
  }

  /*
   * These open politely and then ask for something. Without a key the
   * classifier is unreachable and falls back to `create`, which is the right
   * answer here and is what the assertion checks: the greeting guard must not
   * swallow a real request just because of how it starts.
   */
  const requests = [
    "hey can you make me a product video",
    "hello I want a video about my coffee shop",
    "good morning, make something for TikTok",
  ];
  for (const message of requests) {
    const { intent } = await classify(message, false);
    check(`"${message.slice(0, 28)}..." is not small talk`, intent !== "chat", intent);
  }

  // Nothing at all is not a greeting either; it takes the ordinary fallback.
  const empty = await classify("   ", false);
  check("an empty message is not small talk", empty.intent !== "chat", empty.intent);

  process.stdout.write(
    `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
  );
  if (failures > 0) process.exit(1);
}

void main();
