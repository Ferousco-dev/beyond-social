"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { requestPasswordResetAction, type AuthResult } from "../actions";
import { forgotPasswordSchema, type ForgotPasswordInput } from "../schemas";
import { FormStatus } from "./form-status";
import { SubmitButton } from "./submit-button";
import { TextField } from "./text-field";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: ForgotPasswordInput) {
    setResult(null);
    startTransition(async () => {
      setResult(await requestPasswordResetAction(values));
    });
  }

  if (result?.status === "success") {
    return <FormStatus status="success" message={result.message ?? "Check your inbox."} />;
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {result?.status === "error" ? <FormStatus status="error" message={result.message} /> : null}
      <TextField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        autoFocus
        placeholder="you@company.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <SubmitButton pending={pending} size="lg" className="mt-1 w-full">
        Send reset link
      </SubmitButton>
    </form>
  );
}
