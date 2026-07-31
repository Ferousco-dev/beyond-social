import { type ReactNode } from "react";

/**
 * The only surface an unauthenticated visitor can reach. It borrows the web
 * app's auth layout (same dark canvas, same centred column) minus the branding
 * panel and the "back to home" link, because the console is not the front door
 * to anything and has nowhere to send a visitor who does not belong here.
 */
export default function AuthLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <main id="main" className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
