import { AlertCircle, CheckCircle2 } from "lucide-react";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function FormStatus({
  status,
  message,
}: {
  status: "error" | "success";
  message: string;
}): ReactNode {
  const isError = status === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3.5 py-3 text-sm",
        isError
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-success/30 bg-success/10 text-success",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
