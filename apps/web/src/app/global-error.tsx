"use client";

import { useEffect } from "react";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-sm font-semibold text-destructive">Something went wrong</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            The app hit an unexpected error
          </h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Reload to continue. If the problem persists, try again shortly.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-8 inline-flex h-11 cursor-pointer items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
