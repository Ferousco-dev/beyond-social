import { z } from "zod";

const email = z.string().min(1, "Email is required").email("Enter a valid email address");

// Server enforces the real policy; this mirrors it for fast client feedback.
const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[0-9]/, "Add a number");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean(),
});

export const signupSchema = z
  .object({
    fullName: z.string().min(1, "Name is required").max(80),
    email,
    password,
    confirmPassword: z.string().min(1, "Confirm your password"),
    acceptedTerms: z.boolean().refine((value) => value, {
      message: "You must agree to the Terms and Privacy Policy",
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const otpSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code").regex(/^\d+$/, "Digits only"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
