import { type ReactNode } from "react";

export function AuthHeader({ title, subtitle }: { title: string; subtitle: ReactNode }): ReactNode {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
