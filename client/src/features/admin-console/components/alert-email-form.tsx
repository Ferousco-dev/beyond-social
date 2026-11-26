"use client";

import { Mail } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { saveAlertEmail } from "../actions";

/** Where alerts are emailed. Saving a new address sends it a sample alert. */
export function AlertEmailForm({ current }: { readonly current: string }): ReactNode {
  const [email, setEmail] = useState(current);
  const [saved, setSaved] = useState(current);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const changed = email.trim() !== saved;

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setPending(true);
    setNote(null);
    const result = await saveAlertEmail(email);
    setPending(false);
    if (!result.ok) {
      setNote({ tone: "error", text: result.message });
      return;
    }
    setSaved(email.trim());
    setNote(
      email.trim() === ""
        ? { tone: "ok", text: "Alert emails are off." }
        : result.testSent
          ? { tone: "ok", text: "Saved. A sample alert is on its way." }
          : { tone: "error", text: "Saved, but the sample could not be sent. Check the Resend key in Provider keys." },
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="rounded-xl border border-hairline bg-paper p-4">
      <label htmlFor="alert-email" className="text-sm font-medium text-ink">
        Email alerts to
      </label>
      <div className="mt-2 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input
            id="alert-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="h-9 w-full rounded-lg border border-hairline bg-paper pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft"
          />
        </div>
        {changed ? (
          <button type="submit" disabled={pending} className="btn btn-primary btn-md">
            {pending ? "Saving…" : "Save"}
          </button>
        ) : null}
      </div>
      {note ? (
        <p role={note.tone === "error" ? "alert" : "status"} className={`mt-2 text-xs ${note.tone === "error" ? "text-destructive" : "text-success"}`}>
          {note.text}
        </p>
      ) : null}
    </form>
  );
}
