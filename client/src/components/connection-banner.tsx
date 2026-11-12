"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { useOnline } from "@/hooks/use-online";

/**
 * A quiet pill that appears once when the connection drops and says what still
 * works, then confirms briefly when it comes back. It never blocks the page:
 * drafts stay on this device and reads come from what is already loaded.
 */
export function ConnectionBanner(): ReactNode {
  const online = useOnline();
  const wasOffline = useRef(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setRestored(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setRestored(true);
    const timer = setTimeout(() => setRestored(false), 4000);
    return () => clearTimeout(timer);
  }, [online]);

  if (online && !restored) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
      <p role="status" className="pointer-events-auto rounded-full border border-hairline bg-paper px-4 py-2 text-sm text-ink shadow-card">
        {online ? "Back online." : "You are offline. Your drafts stay on this device. Making a video needs a connection."}
      </p>
    </div>
  );
}
