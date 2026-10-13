import { Monitor } from "lucide-react";
import Link from "next/link";
import { type Route } from "next";

export function DesktopOnly() {
  return (
    <div className="flex h-svh flex-col items-center justify-center gap-3 bg-canvas p-6 text-center">
      <Monitor className="size-10 text-ink-soft" strokeWidth={1.25} aria-hidden />
      <h1 className="text-lg font-semibold text-ink">The editor needs a bigger screen</h1>
      <p role="alert" className="max-w-sm text-sm text-ink-soft">
        For the best experience, use the editor on a desktop or laptop. Your projects are saved and will be here when you switch.
      </p>
      <Link href={"/dashboard/c/new" as Route} className="text-sm text-ink underline underline-offset-2">
        Back to chat
      </Link>
    </div>
  );
}
