import { type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  type = "text",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-sm transition-colors",
        "placeholder:text-muted-foreground",
        "focus-visible:border-ink/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/5",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/30",
        className,
      )}
      {...props}
    />
  );
}
