"use client";

import { useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

import {
  MAX_PANEL_WIDTH,
  MIN_PANEL_WIDTH,
  usePanelWidth,
} from "../hooks/use-panel-width";

interface WorkspaceAssistantProps {
  readonly title: string;
  readonly userName: string;
  readonly isEmpty: boolean;
  readonly children: ReactNode;
}

const KEY_STEP = 16;

export function WorkspaceAssistant({ title, userName, isEmpty, children }: WorkspaceAssistantProps) {
  const { width, commit } = usePanelWidth();
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    commit(width + (event.key === "ArrowLeft" ? KEY_STEP : -KEY_STEP));
  }

  return (
    <aside
      aria-label="Assistant"
      style={{ "--assistant-w": `${width}px` } as CSSProperties}
      className="relative flex h-full w-full shrink-0 flex-col border-t border-hairline bg-paper lg:w-[var(--assistant-w)] lg:border-l lg:border-t-0"
    >
      {/* The left edge drags. Arrow keys do the same for keyboard users. */}
      <div
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label="Resize assistant panel"
        aria-valuenow={Math.round(width)}
        aria-valuemin={MIN_PANEL_WIDTH}
        aria-valuemax={MAX_PANEL_WIDTH}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          drag.current = { startX: event.clientX, startWidth: width };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const active = drag.current;
          if (!active) return;
          commit(active.startWidth + (active.startX - event.clientX));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        className="absolute -left-1.5 top-0 z-10 hidden h-full w-3 cursor-col-resize items-center justify-center outline-none lg:flex"
      >
        <span
          aria-hidden
          className="h-12 w-1 rounded-full bg-hairline opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
        />
      </div>

      <header className="flex shrink-0 items-center px-4 py-2.5">
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{title}</h2>
      </header>

      {isEmpty ? (
        <div className="px-5 pb-2 pt-10 text-center">
          <p className="text-balance text-base text-ink-soft">Hi {userName}</p>
          <p className="mt-1 text-balance text-lg text-ink">What would you like to create?</p>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </aside>
  );
}
