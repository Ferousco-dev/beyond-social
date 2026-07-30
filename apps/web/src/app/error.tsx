"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for local debugging; wire to a monitoring service in production.
    console.error(error);
  }, [error]);

  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center"
    >
      <Logo />
      <p className="mt-10 text-sm font-semibold text-destructive">Something went wrong</p>
      <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        We hit an unexpected error
      </h1>
      <p className="mt-3 max-w-md text-pretty text-muted-foreground">
        Your work is safe. Try again, and if it keeps happening, come back in a moment.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Button size="lg" onClick={reset}>
          Try again
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
