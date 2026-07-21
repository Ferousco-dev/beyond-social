import { type CSSProperties } from "react";

/**
 * Regions of a vertical feed video that the host app draws its own interface
 * over. Expressed as percentages of the frame so they hold at any preview size.
 */
export interface SafeArea {
  readonly id: string;
  readonly label: string;
  readonly edge: "top" | "right" | "bottom";
  readonly sizePercent: number;
}

export const SAFE_AREAS: readonly SafeArea[] = [
  { id: "top", label: "Status", edge: "top", sizePercent: 13 },
  { id: "right", label: "Rail", edge: "right", sizePercent: 20 },
  { id: "bottom", label: "Handle", edge: "bottom", sizePercent: 22 },
];

/** Inset style placing an overlay against the edge it guards. */
export function safeAreaStyle(area: SafeArea): CSSProperties {
  const size = `${area.sizePercent}%`;
  if (area.edge === "top") return { top: 0, left: 0, right: 0, height: size };
  if (area.edge === "bottom") return { bottom: 0, left: 0, right: 0, height: size };
  return { top: 0, bottom: 0, right: 0, width: size };
}
