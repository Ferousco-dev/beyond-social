"use client";

import { useEffect, useState } from "react";

import { type LibraryItem } from "@/lib/go-api/schemas";

import { listMadeVideos } from "../library-actions";

type MadeVideos = { readonly status: "loading" } | { readonly status: "ready"; readonly items: readonly LibraryItem[] } | { readonly status: "error"; readonly message: string };

// The list is read once per visit and shared, so switching tabs or projects
// shows it at once; a failed read is not kept, so the next look tries again.
let pending: Promise<MadeVideos> | null = null;

function load(): Promise<MadeVideos> {
  pending ??= listMadeVideos().then(
    (result): MadeVideos => {
      if (result.ok) return { status: "ready", items: result.items };
      pending = null;
      return { status: "error", message: result.message };
    },
    (): MadeVideos => {
      pending = null;
      return { status: "error", message: "Your videos could not be loaded. Try again." };
    },
  );
  return pending;
}

/** The person's finished videos, loaded in the background while the editor is already usable. */
export function useMadeVideos(): MadeVideos {
  const [state, setState] = useState<MadeVideos>({ status: "loading" });
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
