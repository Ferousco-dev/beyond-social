import assert from "node:assert/strict";
import { test } from "node:test";

import { forgotPasswordSchema, loginSchema, otpSchema, resetPasswordSchema, signupSchema } from "./schemas.ts";

const valid = {
  fullName: "Ada", email: "a@b.co", phone: " 0801234567 ", businessName: " Co ", industry: "Education",
  industryOther: " ", password: "Abcdef12", confirmPassword: "Abcdef12", acceptedTerms: true,
};

function issues(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  return result.error?.issues.map((i) => `${i.path.join(".")}: ${i.message}`) ?? [];
}

test("a complete signup passes and text fields are trimmed", () => {
  const r = signupSchema.safeParse(valid);
  assert.equal(r.success, true);
  assert.equal(r.data?.phone, "0801234567");
  assert.equal(r.data?.businessName, "Co");
});

test("signup reports the same messages the form has always shown", () => {
  assert.deepEqual(issues(signupSchema.safeParse({ ...valid, email: "" })).slice(0, 1), ["email: Email is required"]);
  assert.ok(issues(signupSchema.safeParse({ ...valid, email: "nope" })).includes("email: Enter a valid email address"));
  assert.ok(issues(signupSchema.safeParse({ ...valid, password: "abc", confirmPassword: "abd" })).includes("password: Use at least 8 characters"));
  assert.ok(issues(signupSchema.safeParse({ ...valid, password: "abcdefgh1", confirmPassword: "x" })).includes("password: Add an uppercase letter"));
  assert.ok(issues(signupSchema.safeParse({ ...valid, confirmPassword: "Different1" })).includes("confirmPassword: Passwords do not match"));
  assert.ok(issues(signupSchema.safeParse({ ...valid, acceptedTerms: false })).includes("acceptedTerms: You must agree to the Terms and Privacy Policy"));
  assert.ok(issues(signupSchema.safeParse({ ...valid, industry: "Made up" })).includes("industry: Choose an industry"));
  assert.ok(issues(signupSchema.safeParse({ ...valid, phone: "12" })).includes("phone: Enter a valid phone number"));
});

test("choosing Other requires typing an industry", () => {
  assert.ok(issues(signupSchema.safeParse({ ...valid, industry: "Other", industryOther: "a" })).includes("industryOther: Tell us your industry"));
  assert.equal(signupSchema.safeParse({ ...valid, industry: "Other", industryOther: " Pets " }).success, true);
});

test("login, forgot password, reset password and code checks", () => {
  assert.equal(loginSchema.safeParse({ email: "a@b.co", password: "x", rememberMe: true }).success, true);
  assert.deepEqual(issues(loginSchema.safeParse({ email: "a@b.co", password: "", rememberMe: true })), ["password: Password is required"]);
  assert.equal(forgotPasswordSchema.safeParse({ email: "a@b.co" }).success, true);
  assert.ok(issues(resetPasswordSchema.safeParse({ password: "Abcdef12", confirmPassword: "Zbcdef12" })).includes("confirmPassword: Passwords do not match"));
  assert.equal(otpSchema.safeParse({ code: "123456" }).success, true);
  assert.deepEqual(issues(otpSchema.safeParse({ code: "12345" })), ["code: Enter the 6-digit code"]);
  assert.ok(issues(otpSchema.safeParse({ code: "12345a" })).includes("code: Digits only"));
});
