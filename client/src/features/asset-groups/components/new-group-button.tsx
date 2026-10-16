"use client";

import { useRouter } from "next/navigation";
import { type Route } from "next";
import { useState } from "react";

import { createAssetGroup } from "../actions";

/** Creates the next group (avatar001, avatar002, …) and opens it. */
export function NewGroupButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(): Promise<void> {
    setBusy(true);
    setError(null);
    const result = await createAssetGroup("");
    setBusy(false);
    if (result.status !== "ok") {
      setError(result.status === "unconfigured" ? "The backend is not connected yet." : result.message);
      return;
    }
    router.push(`/dashboard/assets/${result.group.id}` as Route);
  }

  return (
    <span className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => void create()}
        disabled={busy}
        className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Creating…" : "New group"}
      </button>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </span>
  );
}
