"use client";

import { useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { useOnMount } from "@/lib/hooks/use-page-effects";

import { type Route } from "next";

/** Must match the key the export dialog saves before it leaves for a platform. */
const CONNECT_RETURN_KEY = "bs:connect-return";

/**
 * After a sign-in that started somewhere else, such as the editor's Export,
 * takes the person straight back there. A failed or declined sign-in stays
 * here, so they can see why.
 */
export function ConnectReturn({ status }: { status: string | undefined }): ReactNode {
  const router = useRouter();
  useOnMount(() => {
    let back: string | null = null;
    try {
      back = window.sessionStorage.getItem(CONNECT_RETURN_KEY);
      window.sessionStorage.removeItem(CONNECT_RETURN_KEY);
    } catch {
      return;
    }
    // Only a path inside this site, never a full address someone could have planted.
    if (status === "connected" && back && back.startsWith("/") && !back.startsWith("//")) router.replace(back as Route);
  });
  return null;
}
