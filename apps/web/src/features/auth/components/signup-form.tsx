"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { signUpAction, type AuthResult } from "../actions";
import { signupSchema, type SignupInput } from "../schemas";
import { FormStatus } from "./form-status";
import { PasswordField } from "./password-field";
import { SubmitButton } from "./submit-button";
import { TextField } from "./text-field";

export function SignupForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthResult | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  function onSubmit(values: SignupInput) {
    setResult(null);
    startTransition(async () => {
      const response = await signUpAction(values);
      setResult(response);
      if (response.status === "success" && response.redirectTo) {
        window.sessionStorage.setItem("bs:pending-email", values.email);
        router.push(response.redirectTo as Route);
      }
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {result?.status === "error" ? <FormStatus status="error" message={result.message} /> : null}

      <TextField
        id="fullName"
        label="Full name"
        autoComplete="name"
        autoFocus
        placeholder="Alex Rivera"
        error={errors.fullName?.message}
        {...register("fullName")}
      />
      <TextField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <PasswordField
        id="password"
        label="Password"
        autoComplete="new-password"
        showStrength
        value={watch("password")}
        error={errors.password?.message}
        {...register("password")}
      />
      <PasswordField
        id="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        value={watch("confirmPassword")}
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <SubmitButton pending={pending} size="lg" className="mt-1 w-full">
        Create account
      </SubmitButton>
    </form>
  );
}
