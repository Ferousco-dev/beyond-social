import { type ReactNode } from "react";

import { ConnectionBanner } from "@/components/connection-banner";

export default function EditorLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <>
      <ConnectionBanner />
      {children}
    </>
  );
}
