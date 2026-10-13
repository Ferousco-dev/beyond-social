"use client";

import { type ReactNode } from "react";
import { Group, Panel, Separator, useDefaultLayout, type LayoutStorage } from "react-resizable-panels";

import { STUDIO_PANELS } from "../config";

interface Panes {
  tools: ReactNode;
  preview: ReactNode;
  inspector: ReactNode;
  timeline: ReactNode;
}

const storage: LayoutStorage = {
  getItem: (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* A full or blocked store only loses the remembered sizes. */
    }
  },
};

const HANDLE = "relative bg-transparent after:absolute after:bg-transparent hover:after:bg-primary/40 data-[separator=active]:after:bg-primary/60 aria-[orientation=vertical]:w-1 aria-[orientation=vertical]:after:inset-y-0 aria-[orientation=vertical]:after:left-1/2 aria-[orientation=vertical]:after:w-0.5 aria-[orientation=horizontal]:h-1 aria-[orientation=horizontal]:after:inset-x-0 aria-[orientation=horizontal]:after:top-1/2 aria-[orientation=horizontal]:after:h-0.5";

export function StudioLayout(panes: Panes) {
  const rows = useDefaultLayout({ id: `${STUDIO_PANELS.STORAGE_KEY}-rows`, panelIds: ["main", "timeline"], storage });
  const columns = useDefaultLayout({ id: `${STUDIO_PANELS.STORAGE_KEY}-columns`, panelIds: ["tools", "preview", "inspector"], storage });
  const P = STUDIO_PANELS;

  return (
    <Group orientation="vertical" className="gap-1" defaultLayout={rows.defaultLayout} onLayoutChanged={rows.onLayoutChanged}>
      <Panel id="main" defaultSize={P.MAIN.DEFAULT} minSize={P.MAIN.MIN} maxSize={P.MAIN.MAX} className="min-h-0">
        <Group orientation="horizontal" className="gap-1 px-3" defaultLayout={columns.defaultLayout} onLayoutChanged={columns.onLayoutChanged}>
          <Panel id="tools" defaultSize={P.TOOLS.DEFAULT} minSize={P.TOOLS.MIN} maxSize={P.TOOLS.MAX} className="min-w-0">{panes.tools}</Panel>
          <Separator className={HANDLE} />
          <Panel id="preview" defaultSize={P.PREVIEW.DEFAULT} minSize={P.PREVIEW.MIN} className="min-w-0">{panes.preview}</Panel>
          <Separator className={HANDLE} />
          <Panel id="inspector" defaultSize={P.INSPECTOR.DEFAULT} minSize={P.INSPECTOR.MIN} maxSize={P.INSPECTOR.MAX} className="min-w-0">{panes.inspector}</Panel>
        </Group>
      </Panel>
      <Separator className={HANDLE} />
      <Panel id="timeline" defaultSize={P.TIMELINE.DEFAULT} minSize={P.TIMELINE.MIN} maxSize={P.TIMELINE.MAX} className="min-h-0 px-3 pb-3">{panes.timeline}</Panel>
    </Group>
  );
}
