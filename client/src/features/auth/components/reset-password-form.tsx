"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { resetPasswordAction, type AuthResult } from "../actions";
import { resetPasswordSchema, type ResetPasswordInput } from "../schemas";
import { FormStatus } from "./form-status";
import { PasswordField } from "./password-field";
import { SubmitButton } from "./submit-button";

export function ResetPasswordForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthResult | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  function onSubmit(values: ResetPasswordInput) {
    setResult(null);
    startTransition(async () => {
      const response = await resetPasswordAction(values);
      setResult(response);
      if (response.status === "success" && response.redirectTo) {
        router.push(response.redirectTo as Route);
      }
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {result?.status === "error" ? <FormStatus status="error" message={result.message} /> : null}
      <PasswordField
        id="password"
        label="New password"
        autoComplete="new-password"
        showStrength
        autoFocus
        value={watch("password")}
        error={errors.password?.message}
        {...register("password")}
      />
      <PasswordField
        id="confirmPassword"
        label="Confirm new password"
        autoComplete="new-password"
        value={watch("confirmPassword")}
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <SubmitButton pending={pending} size="lg" className="mt-1 w-full">
        Update password
      </SubmitButton>
    </form>
  );
}
