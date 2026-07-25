"use client";

import { Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { createOrganization } from "../actions";

/** Minimal create form; the slug is derived, so there is one field to fill. */
export function CreateTeamForm() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        startTransition(async () => {
          const result = await createOrganization({ name });
          if (result.status === "ok") setName("");
          else setMessage(result.message);
        });
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <label className="sr-only" htmlFor="team-name">
        Team name
      </label>
      <input
        id="team-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Team name"
        className="h-9 min-w-48 flex-1 rounded-lg border border-hairline bg-canvas px-3 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      <button
        type="submit"
        disabled={pending || name.trim().length < 2}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3.5 text-sm font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
        Create team
      </button>
      {message ? (
        <p role="status" className="w-full text-xs text-destructive">
          {message}
        </p>
      ) : null}
    </form>
  );
}
