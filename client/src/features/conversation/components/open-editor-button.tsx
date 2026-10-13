"use client";

import { Clapperboard } from "lucide-react";
import { type Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { openEditor } from "@/features/studio/actions";

export function OpenEditorButton({ conversationId }: { readonly conversationId: string }): ReactNode {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const open = (): void =>
    startTransition(async () => {
      setError(null);
      const result = await openEditor(conversationId);
      if (result.ok) router.push(`/editor/${result.value}` as Route);
      else setError(result.message);
    });

  return (
    <div className="flex items-center gap-3">
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-hairline bg-paper px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
      >
        <Clapperboard className="size-4" aria-hidden />
        {pending ? "Opening" : "Open editor"}
      </button>
    </div>
  );
}
