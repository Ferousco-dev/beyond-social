import { Loader2 } from "lucide-react";
import { type ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

export function SubmitButton({
  pending,
  children,
  ...props
}: ButtonProps & { pending?: boolean; children: ReactNode }) {
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}
