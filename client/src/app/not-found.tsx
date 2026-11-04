import Link from "next/link";
import { type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound(): ReactNode {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center"
    >
      <Logo />
      <p className="mt-10 text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        This page went off-script
      </h1>
      <p className="mt-3 max-w-md text-pretty text-muted-foreground">
        The page you are looking for was moved, renamed, or never existed. Let us get you back on
        track.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
