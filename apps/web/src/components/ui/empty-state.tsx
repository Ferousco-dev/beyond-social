import { type Route } from "next";
import Link from "next/link";
import { type ComponentType, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Empty and error states answer the same three questions in the same order:
 * what this is, why there is nothing here or why it broke, and the one thing to
 * do about it. `StatePanel` is that shape. `EmptyState` and `ErrorState` are the
 * two tones it comes in, and live in separate files so each stays one thing.
 *
 * One action, not several. A screen with nothing on it is the worst place to
 * offer a choice, because the user has no information to choose with.
 */

export type StateAction =
  | { readonly label: string; readonly href: Route }
  | { readonly label: string; readonly onClick: () => void };

export interface StatePanelProps {
  readonly tone: "empty" | "error";
  readonly icon?: ComponentType<{ className?: string }>;
  /** What this is. */
  readonly title: string;
  /** Why it is empty or broken, and whether anything was lost. */
  readonly body: ReactNode;
  readonly action?: StateAction;
  /** A quieter escape hatch, never competing with `action` for attention. */
  readonly secondary?: StateAction;
  /** Support reference, shown under the actions. */
  readonly footer?: ReactNode;
  readonly className?: string;
}

export function StatePanel({
  tone,
  icon: Icon,
  title,
  body,
  action,
  secondary,
  footer,
  className,
}: StatePanelProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-paper p-10 text-center",
        tone === "empty" ? "border-dashed border-hairline" : "border-destructive/30",
        className,
      )}
    >
      {Icon !== undefined && (
        <Icon
          className={cn(
            "mx-auto mb-4 size-6",
            tone === "empty" ? "text-ink-soft" : "text-destructive",
          )}
        />
      )}
      <p className="text-sm font-medium text-ink">{title}</p>
      <div className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">{body}</div>

      {(action !== undefined || secondary !== undefined) && (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {action !== undefined && <ActionButton action={action} />}
          {secondary !== undefined && <ActionButton action={secondary} variant="outline" />}
        </div>
      )}

      {footer !== undefined && <div className="mt-6">{footer}</div>}
    </div>
  );
}

function ActionButton({
  action,
  variant = "default",
}: {
  action: StateAction;
  variant?: "default" | "outline";
}) {
  if ("href" in action) {
    return (
      <Button asChild variant={variant}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }
  return (
    <Button type="button" variant={variant} onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

export interface EmptyStateProps {
  readonly icon?: ComponentType<{ className?: string }>;
  readonly title: string;
  readonly body: ReactNode;
  readonly action?: StateAction;
  readonly className?: string;
}

/**
 * Nothing here yet. The body says why it is empty, which is almost always "you
 * have not done the thing that fills it", and the action is that thing.
 */
export function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
  return (
    <StatePanel tone="empty" icon={icon} title={title} body={body} action={action} className={className} />
  );
}
