"use client";

import { type Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { useClientValue } from "@/lib/hooks/use-client-value";
import { useTimeout } from "@/lib/hooks/use-timers";

import { verifyOtpAction, type AuthResult } from "../actions";
import { FormStatus } from "./form-status";
import { OtpInput } from "./otp-input";
import { SubmitButton } from "./submit-button";

const RESEND_SECONDS = 30;

/** The address the code was sent to, kept for this tab by the sign-up step. */
function pendingEmail(): string {
  try {
    return window.sessionStorage.getItem("bs:pending-email") ?? "";
  } catch {
    return "";
  }
}

export function OtpForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const email = useClientValue(pendingEmail, "");
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthResult | null>(null);

  useTimeout(() => setSeconds((value) => value - 1), seconds > 0 ? 1000 : null, seconds);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      const response = await verifyOtpAction({ code, email });
      setResult(response);
      if (response.status === "success" && response.redirectTo) {
        router.push(response.redirectTo as Route);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {result?.status === "error" ? <FormStatus status="error" message={result.message} /> : null}

      <OtpInput value={code} onChange={setCode} disabled={pending} />

      <SubmitButton
        pending={pending}
        size="lg"
        className="w-full"
        disabled={pending || code.length !== 6}
      >
        Verify
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        {seconds > 0 ? (
          <span className="tabular-nums">Resend code in {seconds}s</span>
        ) : (
          <button
            type="button"
            onClick={() => setSeconds(RESEND_SECONDS)}
            className="cursor-pointer font-medium text-primary hover:underline"
          >
            Resend code
          </button>
        )}
      </p>
    </form>
  );
}
