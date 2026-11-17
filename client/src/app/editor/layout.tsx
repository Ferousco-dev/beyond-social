import { type ReactNode } from "react";

import { ConnectionBanner } from "@/components/connection-banner";
import { ServiceBanner } from "@/components/service-banner";

export default function EditorLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <>
      <ServiceBanner />
      <ConnectionBanner />
      {children}
    </>
  );
}
