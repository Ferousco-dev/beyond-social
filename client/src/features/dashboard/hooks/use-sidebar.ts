"use client";

import { useSyncExternalStore } from "react";

const KEY = "bs_sidebar_collapsed";
export const SIDEBAR_EXPANDED_PX = 276;
export const SIDEBAR_COLLAPSED_PX = 76;

const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

let collapsed = typeof window === "undefined" ? false : read();

/** The content beside the sidebar reads this variable, so it follows the sidebar's width. */
function apply(): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--sidebar-w", `${collapsed ? SIDEBAR_COLLAPSED_PX : SIDEBAR_EXPANDED_PX}px`);
}
apply();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function toggle(): void {
  collapsed = !collapsed;
  try {
    localStorage.setItem(KEY, collapsed ? "1" : "0");
  } catch {
    /* storage is unavailable: the choice lasts until the page closes */
  }
  apply();
  listeners.forEach((listener) => listener());
}

/** Whether the desktop sidebar is narrowed to icons. The choice is remembered. */
export function useSidebar(): { readonly collapsed: boolean; readonly toggle: () => void } {
  const isCollapsed = useSyncExternalStore(subscribe, () => collapsed, () => false);
  return { collapsed: isCollapsed, toggle };
}
