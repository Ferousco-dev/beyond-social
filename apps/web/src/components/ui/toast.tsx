"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Transient outcomes: "Published", "Copied", "That did not send".
 *
 * Built here rather than pulled in, because adding a dependency needs the
 * owner's say-so and the installed Radix packages (dialog, dropdown-menu, slot)
 * do not include a toast. What a toast primitive owes the user is a live region
 * that assistive tech announces, a timer that stops while the toast is being
 * read, and a real dismiss control. All three are below, and none of them need
 * a library.
 *
 * A toast is never the only place a failure is reported: it disappears, so
 * anything the user must act on belongs in an `ErrorState` or beside the field.
 */

type ToastVariant = "success" | "error" | "info";

export interface ToastOptions {
  /** What happened. Past tense, specific. */
  readonly title: string;
  /** Impact and next step, when either is not obvious from the title. */
  readonly description?: string;
  readonly variant?: ToastVariant;
  readonly action?: { readonly label: string; readonly onClick: () => void };
}

interface ToastRecord extends ToastOptions {
  readonly id: number;
  readonly variant: ToastVariant;
}

interface ToastApi {
  readonly toast: (options: ToastOptions) => void;
  readonly dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (api === null) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}

/** An error needs longer than a confirmation, because it has to be read. */
const DURATION_MS: Readonly<Record<ToastVariant, number>> = {
  success: 4_000,
  info: 5_000,
  error: 9_000,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly ToastRecord[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    // Oldest first out: a stack that grows without bound covers the app.
    setToasts((current) => [
      ...current.slice(-2),
      { ...options, variant: options.variant ?? "info", id },
    ]);
  }, []);

  const api = useMemo<ToastApi>(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: readonly ToastRecord[];
  onDismiss: (id: number) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <ol
      aria-label="Notifications"
      // Polite: a toast reports something that already finished, so it should
      // wait for a gap rather than cut across whatever is being read.
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} toast={item} onDismiss={onDismiss} />
      ))}
    </ol>,
    document.body,
  );
}

const ICONS: Readonly<Record<ToastVariant, typeof Info>> = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
};

const ICON_TONE: Readonly<Record<ToastVariant, string>> = {
  success: "text-success",
  error: "text-destructive",
  info: "text-ink-soft",
};

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const Icon = ICONS[toast.variant];
  const { id } = toast;

  useEffect(() => {
    // Hovering or tabbing into a toast means it is being read, and a message
    // that vanishes mid-sentence is the same as one that was never shown.
    if (paused) return;
    const timer = window.setTimeout(() => onDismiss(id), DURATION_MS[toast.variant]);
    return () => window.clearTimeout(timer);
  }, [id, paused, toast.variant, onDismiss]);

  return (
    <li
      role={toast.variant === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-hairline bg-paper p-3 pl-4 shadow-card"
    >
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", ICON_TONE[toast.variant])} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{toast.title}</p>
        {toast.description !== undefined && (
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{toast.description}</p>
        )}
        {toast.action !== undefined && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(id);
            }}
            className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label={`Dismiss: ${toast.title}`}
        className="-m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <X aria-hidden className="size-4" />
      </button>
    </li>
  );
}
