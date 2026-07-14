import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Container({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}): ReactNode {
  return <div className={cn("mx-auto w-full max-w-6xl px-6 lg:px-8", className)}>{children}</div>;
}
