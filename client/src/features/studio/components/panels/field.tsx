import { type ReactNode } from "react";

export function Field({ label, value, children }: { label: string; value?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-ink-soft">
        <span>{label}</span>
        {value ? <span className="font-mono uppercase">{value}</span> : null}
      </div>
      {children}
    </div>
  );
}

export const INPUT =
  "h-9 w-full rounded-lg border border-hairline bg-canvas px-3 text-sm text-ink focus-visible:border-primary focus-visible:outline-none";
