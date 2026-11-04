import { type ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function SubmitButton({
  pending,
  children,
  ...props
}: ButtonProps & { pending?: boolean; children: ReactNode }) {
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? <Spinner className="size-4" /> : null}
      {children}
    </Button>
  );
}
