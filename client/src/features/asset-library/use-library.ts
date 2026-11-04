"use client";

import { useEffect, useState } from "react";

import { listLibraryAssets } from "./actions";
import type { LibraryAsset } from "./types";

type LibraryState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly assets: readonly LibraryAsset[] }
  | { readonly status: "error"; readonly message: string };

// One read per visit: every step that offers saved assets shares it, so moving
// between steps never waits on the library again.
let pending: Promise<LibraryState> | null = null;

function load(): Promise<LibraryState> {
  pending ??= listLibraryAssets()
    .then((result): LibraryState => {
      if (result.status === "ok") return { status: "ready", assets: result.assets };
      pending = null;
      return { status: "error", message: result.status === "unconfigured" ? "The backend is not connected yet." : result.message };
    })
    .catch((): LibraryState => {
      pending = null;
      return { status: "error", message: "Your library could not be loaded. Try again." };
    });
  return pending;
}

/** Starts reading the library early, before the step that needs it opens. */
export function preloadLibrary(): void {
  void load();
}

/** The person's saved assets, read once and shared by every step that needs them. */
export function useLibrary(): LibraryState {
  const [state, setState] = useState<LibraryState>({ status: "loading" });
  useEffect(() => {
    let active = true;
    void load().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);
  return state;
}

/** Forgets the shared read after the library changes, so the next step sees it. */
export function invalidateLibrary(): void {
  pending = null;
}
