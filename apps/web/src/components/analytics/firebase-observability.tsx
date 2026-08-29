"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { track } from "@/lib/firebase/client";
import { reportError } from "@/lib/firebase/report-error";

/**
 * The two things a React error boundary cannot see: a page view under
 * client-side routing, and an error thrown outside React's render (an event
 * handler, a timer, a rejected promise nobody awaited). Both go through
 * Firebase Analytics the same way `error.tsx` does.
 *
 * Mounted once in the root layout. No-ops entirely when Firebase is not
 * configured; see `lib/firebase/client.ts`.
 */
export function FirebaseObservability() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportError(event.error instanceof Error ? event.error : new Error(event.message), {
        boundary: "window",
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      reportError(reason instanceof Error ? reason : new Error(String(reason)), {
        boundary: "unhandledrejection",
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  );
}

/**
 * Firebase's automatic page-view collection assumes a full page load per
 * route, which App Router navigation never does. `useSearchParams` requires
 * its own suspense boundary, kept local so it cannot delay anything else in
 * the layout.
 */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    track("page_view", { page_path: query ? `${pathname}?${query}` : pathname });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchParams read via toString(), not identity
  }, [pathname, searchParams.toString()]);

  return null;
}
