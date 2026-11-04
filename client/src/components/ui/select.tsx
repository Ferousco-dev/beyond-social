"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

// Radix reserves "" for "nothing selected", so an option meant to be empty
// (like "No reference image") travels under this stand-in instead. Without
// such an option, "" stays "" and the placeholder shows.
const EMPTY = "__empty__";
const fromRadix = (value: string): string => (value === EMPTY ? "" : value);

const triggerClass =
  "flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-[10px] border border-hairline bg-paper px-3 text-left text-sm font-normal text-ink transition-colors hover:bg-cloud/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive data-[placeholder]:text-ink-soft";

/**
 * The app's dropdown, in place of the browser's own.
 *
 * Controlled with `value`, or uncontrolled with `defaultValue` plus `name` for
 * plain form posts: Radix keeps a hidden native select in sync for those.
 */
export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  id,
  name,
  placeholder,
  disabled,
  invalid,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
}: {
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}) {
  const hasEmpty = options.some((option) => option.value === "");
  const toRadix = (raw: string): string => (raw === "" && hasEmpty ? EMPTY : raw);
  return (
    <RadixSelect.Root
      value={value === undefined ? undefined : toRadix(value)}
      defaultValue={defaultValue === undefined ? undefined : toRadix(defaultValue)}
      onValueChange={(next) => onValueChange?.(fromRadix(next))}
      name={name}
      disabled={disabled}
    >
      <RadixSelect.Trigger id={id} aria-label={ariaLabel} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={cn(triggerClass, className)}>
        <span className="truncate">
          <RadixSelect.Value placeholder={placeholder} />
        </span>
        <RadixSelect.Icon>
          <ChevronDown className="size-4 shrink-0 text-ink-soft" aria-hidden />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-[min(var(--radix-select-content-available-height),320px)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-hairline bg-paper shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={toRadix(option.value)}
                className="relative flex min-h-9 cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-8 text-sm text-ink outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-cloud data-[disabled]:opacity-50"
              >
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-2.5 inline-flex">
                  <Check className="size-4 text-ink" aria-hidden />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
