import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { type PasswordStrength } from "../password-strength";

const BAR_COLORS: Record<number, string> = {
  0: "bg-destructive",
  1: "bg-destructive",
  2: "bg-warning",
  3: "bg-primary",
  4: "bg-success",
};

export function PasswordStrengthMeter({ strength }: { strength: PasswordStrength }): ReactNode {
  return (
    <div className="mt-0.5">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              index < strength.score ? BAR_COLORS[strength.score] : "bg-border",
            )}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Password strength: <span className="font-medium text-foreground">{strength.label}</span>
      </p>
    </div>
  );
}
