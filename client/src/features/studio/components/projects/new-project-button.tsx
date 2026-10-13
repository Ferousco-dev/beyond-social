"use client";

import { Plus } from "lucide-react";
import { type Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { createProject } from "../../actions";

export function NewProjectButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const create = (): void =>
    startTransition(async () => {
      setError(null);
      const result = await createProject();
      if (!result.ok) setError(result.message);
      else router.push(`/editor/${result.value}` as Route);
    });

  return (
    <div>
      <Button onClick={create} disabled={pending}>
        <Plus aria-hidden />
        New project
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
