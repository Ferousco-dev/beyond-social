"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";

/**
 * Turns the confirmation dialog into something a handler can await.
 *
 * Deliberately not a context provider. A provider would have to be mounted in a
 * layout that every calling feature shares, which couples unrelated parts of the
 * tree to each other for no gain. Rendering `dialog` beside the control keeps
 * the confirmation local to the thing it guards.
 *
 *   const { confirm, dialog } = useConfirm();
 *   if (!(await confirm({ ... }))) return;
 */
export function useConfirm(): {
  readonly confirm: (options: ConfirmOptions) => Promise<boolean>;
  readonly dialog: ReactNode;
} {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions): Promise<boolean> => {
    // A second request while one is open would strand the first promise, so
    // settle it as a cancel before taking over.
    resolveRef.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleResolve = useCallback((confirmed: boolean) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setOptions(null);
    resolve?.(confirmed);
  }, []);

  return {
    confirm,
    dialog: <ConfirmDialog open={options !== null} options={options} onResolve={handleResolve} />,
  };
}
