"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { estimatePasswordStrength } from "../password-strength";
import { PasswordStrengthMeter } from "./password-strength-meter";

interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  value: string;
  error?: string;
  showStrength?: boolean;
}

export function PasswordField({
  id,
  label,
  value,
  error,
  showStrength = false,
  className,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const strength = showStrength && value.length > 0 ? estimatePasswordStrength(value) : null;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
          className={cn("pr-11", className)}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          // The eye is the only way back from a mistyped password on a phone, so
          // it gets a finger-sized target there. Focus is visible: the field it
          // sits inside is the one place a keyboard user is most likely to be.
          className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary pointer-coarse:size-11"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {capsLock ? (
        <p className="text-xs font-medium text-warning" role="status">
          Caps Lock is on
        </p>
      ) : null}
      {strength ? <PasswordStrengthMeter strength={strength} /> : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
