import { type ReactNode } from "react";

export function OrDivider({ label }: { label: string }): ReactNode {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="whitespace-nowrap text-xs text-muted-foreground">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
