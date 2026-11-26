"use client";

import { useEffect, useRef, useState } from "react";

export type Loaded<T> =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "done"; readonly value: T }
  | { readonly status: "failed" };

/**
 * Runs `load` whenever `key` changes, and keeps only the answer for the
 * current key: an older request that answers late is dropped, which is the
 * race hand-written fetch effects get wrong. Pass a null key to load nothing.
 */
export function useLoad<T>(load: () => Promise<T>, key: string | null): Loaded<T> {
  const latest = useRef(load);
  latest.current = load;
  const [result, setResult] = useState<{ key: string; loaded: Loaded<T> } | null>(null);

  useEffect(() => {
    if (key === null) return;
    let current = true;
    latest.current().then(
      (value) => {
        if (current) setResult({ key, loaded: { status: "done", value } });
      },
      () => {
        if (current) setResult({ key, loaded: { status: "failed" } });
      },
    );
    return () => {
      current = false;
    };
  }, [key]);

  if (key === null) return { status: "idle" };
  return result?.key === key ? result.loaded : { status: "loading" };
}
