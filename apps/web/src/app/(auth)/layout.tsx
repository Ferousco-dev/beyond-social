import { type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { AuthBrandingPanel } from "@/features/auth/components/auth-branding-panel";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <AuthBrandingPanel />
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
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
