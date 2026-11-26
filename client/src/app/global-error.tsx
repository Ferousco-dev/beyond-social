"use client";

import "./globals.css";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main
          id="main"
          className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center"
        >
          <p className="text-sm font-semibold text-destructive">Something went wrong</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            The app stopped working
          </h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Reload to continue. If it happens again, wait a few minutes.
          </p>
          <button
            type="button"
            onClick={reset}
            className="btn btn-primary btn-md mt-8"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
