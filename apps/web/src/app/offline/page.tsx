import { type Metadata } from "next";
import { type ReactNode } from "react";

export const metadata: Metadata = {
  title: "Offline",
};

/**
 * Shown by the service worker when a navigation cannot reach the network.
 *
 * It does not offer a retry button: the button would only reload, which is what
 * the browser's own control already does, and a dead button is worse than none.
 */
export default function Offline(): ReactNode {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center px-6 text-center"
    >
      <h1 className="text-lg font-semibold text-ink">You are offline</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        Beyond Social needs a connection to write and render video. Your saved work is on the
        server, so nothing is lost. This page will work again as soon as you are back.
      </p>
    </main>
  );
}
