"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { signOutAction } from "../actions";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await signOutAction();
          router.push("/login");
          router.refresh();
        })
      }
    >
      Sign out
    </Button>
  );
}
