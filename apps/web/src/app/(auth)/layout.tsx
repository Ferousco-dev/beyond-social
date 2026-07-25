import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { AuthBrandingPanel } from "@/features/auth/components/auth-branding-panel";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    // Auth is part of the same dark surface as the landing page and the
    // workspace, so the funnel does not jump from a black page to a white one
    // for readers whose system theme is light. The `dark` class scopes the dark
    // token set to this subtree.
    <div className="dark grid min-h-dvh bg-canvas text-ink lg:grid-cols-2">
      <AuthBrandingPanel />
      <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-12">
        <Link
          href="/"
          className="absolute left-6 top-6 inline-flex items-center gap-1.5 rounded-full text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
