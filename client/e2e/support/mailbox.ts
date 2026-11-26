import { expect } from "@playwright/test";

import { stack } from "./stack";

interface Summary {
  readonly ID: string;
  readonly Created: string;
}

/** Waits for the newest email to `to` in the local Supabase mailbox and returns its six-digit code. */
export async function codeFor(to: string, after = new Date(0)): Promise<string> {
  let code = "";
  await expect
    .poll(
      async () => {
        const search = await fetch(`${stack.mailUrl}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
        if (!search.ok) return "";
        const { messages } = (await search.json()) as { messages: Summary[] };
        const newest = messages.filter((m) => new Date(m.Created) >= after).sort((a, b) => b.Created.localeCompare(a.Created))[0];
        if (!newest) return "";
        const message = (await (await fetch(`${stack.mailUrl}/api/v1/message/${newest.ID}`)).json()) as { Text: string };
        code = /\b(\d{6})\b/u.exec(message.Text)?.[1] ?? "";
        return code;
      },
      { message: `no sign-up code reached ${to}`, timeout: 30_000 },
    )
    .not.toBe("");
  return code;
}
