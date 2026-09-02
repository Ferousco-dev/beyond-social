"use client";

import { Plus } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { WEBHOOK_EVENT_LABELS, WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/webhooks/types";
import { checkWebhookUrl, WEBHOOK_URL_MESSAGES } from "@/lib/webhooks/url";
import { Spinner } from "@/components/ui/spinner";

export interface WebhookFormProps {
  onCreated: (secret: string) => void;
  submit: (input: {
    url: string;
    events: WebhookEvent[];
  }) => Promise<{ status: "ok"; secret: string } | { status: "error"; message: string }>;
}

/** Registers an endpoint. The URL check runs here too, for a fast answer. */
export function WebhookForm({ onCreated, submit }: WebhookFormProps) {
  const urlId = useId();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<readonly WebhookEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (event: WebhookEvent) => {
    setEvents((current) =>
      current.includes(event) ? current.filter((item) => item !== event) : [...current, event],
    );
  };

  return (
    <form
      noValidate
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        const checked = checkWebhookUrl(url);
        if (!checked.ok) {
          setError(WEBHOOK_URL_MESSAGES[checked.reason]);
          return;
        }
        if (events.length === 0) {
          setError("Choose at least one event to send.");
          return;
        }
        setError(null);
        startTransition(async () => {
          const result = await submit({ url: checked.url, events: [...events] });
          if (result.status === "ok") {
            onCreated(result.secret);
            setUrl("");
            setEvents([]);
          } else {
            setError(result.message);
          }
        });
      }}
      className="rounded-xl border border-hairline bg-paper p-5"
    >
      <label htmlFor={urlId} className="block text-sm font-medium text-ink">
        Endpoint URL
      </label>
      <p className="mt-1 text-xs text-ink-soft">
        Must be https, and reachable from the public internet.
      </p>
      <input
        id={urlId}
        type="url"
        inputMode="url"
        value={url}
        onChange={(changeEvent) => setUrl(changeEvent.target.value)}
        placeholder="https://example.com/hooks/beyond"
        aria-invalid={error !== null}
        aria-describedby={error ? `${urlId}-error` : undefined}
        className="mt-2 h-11 w-full rounded-lg border border-hairline bg-canvas px-3 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />

      <fieldset className="mt-5">
        <legend className="text-sm font-medium text-ink">Events</legend>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {WEBHOOK_EVENTS.map((event) => (
            <label
              key={event}
              className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-cloud has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
            >
              <input
                type="checkbox"
                checked={events.includes(event)}
                onChange={() => toggle(event)}
                className="size-4 shrink-0 accent-primary focus:outline-none"
              />
              <span className="min-w-0">
                <span className="block font-mono text-xs text-ink">{event}</span>
                <span className="block text-xs text-ink-soft">{WEBHOOK_EVENT_LABELS[event]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {error ? (
        <p id={`${urlId}-error`} role="alert" className="mt-3 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 inline-flex h-11 items-center gap-1.5 rounded-lg bg-ink px-4 text-sm font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? <Spinner className="size-3.5" /> : <Plus className="size-3.5" aria-hidden />}
        Add endpoint
      </button>
    </form>
  );
}
