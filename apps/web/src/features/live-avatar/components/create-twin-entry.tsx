"use client";

import { useState, type ReactNode } from "react";

import { CreateTwinScreen, type TwinFootage } from "./create-twin-screen";

/**
 * The client half of the Live entry point: holds what was captured, and says
 * what happens to it.
 *
 * Deliberately stops at "captured". Uploading the clip and starting training
 * are the next unit, and this screen is independently useful before them: the
 * recording flow, the prompts, and the consent reading are the parts that need
 * to be right in front of a real person, and none of them need a provider to
 * be exercised.
 *
 * Saying that out loud in the UI, rather than showing a spinner that goes
 * nowhere, is the difference between an unfinished feature and a dishonest one.
 */
export function CreateTwinEntry({ name }: { name: string }): ReactNode {
  const [captured, setCaptured] = useState<TwinFootage | null>(null);

  if (captured) {
    const size = (captured.file.size / (1024 * 1024)).toFixed(1);
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Footage captured</h1>
        <p className="mt-3 text-sm text-ink-soft">
          {captured.seconds === null
            ? `${captured.file.name}, ${size}MB.`
            : `${captured.seconds} seconds, ${size}MB.`}{" "}
          Training your avatar from it is the next step, and is not connected yet, so nothing has
          been uploaded or sent anywhere.
        </p>
        <button
          type="button"
          onClick={() => setCaptured(null)}
          className="mt-6 inline-flex h-10 cursor-pointer items-center rounded-lg border border-hairline px-4 text-sm text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Record something else
        </button>
      </div>
    );
  }

  return <CreateTwinScreen name={name} onFootage={setCaptured} />;
}
