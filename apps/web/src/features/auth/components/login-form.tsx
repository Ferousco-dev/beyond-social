"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { signInAction, type AuthResult } from "../actions";
import { loginSchema, type LoginInput } from "../schemas";
import { FormStatus } from "./form-status";
import { PasswordField } from "./password-field";
import { SubmitButton } from "./submit-button";
import { TextField } from "./text-field";

const LAST_EMAIL_KEY = "bs:last-email";

export function LoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthResult | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  useEffect(() => {
    const stored = window.localStorage.getItem(LAST_EMAIL_KEY);
    if (stored) setValue("email", stored);
  }, [setValue]);

  function onSubmit(values: LoginInput) {
    setResult(null);
    startTransition(async () => {
      try {
        const response = await signInAction(values);
        setResult(response);
        if (response.status === "success" && response.redirectTo) {
          if (values.rememberMe) window.localStorage.setItem(LAST_EMAIL_KEY, values.email);
          else window.localStorage.removeItem(LAST_EMAIL_KEY);

          const requested = new URLSearchParams(window.location.search).get("redirect");
          const destination =
            requested && requested.startsWith("/") && !requested.startsWith("//")
              ? requested
              : response.redirectTo;
          router.push(destination as Route);
        }
      } catch {
        setResult({ status: "error", message: "Something went wrong. Please try again." });
      }
    });
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

      <PasswordField
        id="password"
        label="Password"
        autoComplete="current-password"
        value={watch("password")}
        error={errors.password?.message}
        {...register("password")}
      />

      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="size-4 rounded border-border accent-primary"
            {...register("rememberMe")}
          />
          {/* Named for what it does. It stores the address for next time; it
              does not extend the session, which persists either way. */}
          Remember my email
        </label>
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          Forgot password?
        </Link>
      </div>

      <SubmitButton pending={pending} size="lg" className="mt-1 w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
