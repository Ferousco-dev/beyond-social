import { projectFromGenerations } from "@/lib/editor/from-generations";
import { type Project } from "@/lib/editor/types";

import { type PickerAsset } from "../components/asset-picker";
import { type CanvasTake } from "../components/workspace-canvas";

const BUCKET = "https://storage.googleapis.com/gtv-videos-bucket/sample";

/** Public sample clips standing in for renders, so the workspace reads as finished. */
export const DEMO_TAKES: readonly CanvasTake[] = [
  { id: "demo-blazes", label: "Neon street chase", url: `${BUCKET}/ForBiggerBlazes.mp4` },
  { id: "demo-escapes", label: "Rooftop escape", url: `${BUCKET}/ForBiggerEscapes.mp4` },
  { id: "demo-joyrides", label: "Desert joyride", url: `${BUCKET}/ForBiggerJoyrides.mp4` },
];

export function demoProject(): Project {
  return projectFromGenerations(
    DEMO_TAKES.map((take, index) => ({
      id: take.id,
      prompt: take.label,
      resultUrl: take.url,
      durationSeconds: 8 + index * 2,
    })),
  );
}

export function demoPickerAssets(): PickerAsset[] {
  return [
    ...DEMO_TAKES.map((take) => ({
      id: take.id,
      label: take.label,
      url: take.url,
      kind: "video",
    })),
    {
      id: "demo-still-1",
      label: "Poster frame",
      url: "https://picsum.photos/seed/beyond-poster/640/360",
      kind: "image",
    },
    {
      id: "demo-still-2",
      label: "Location scout",
      url: "https://picsum.photos/seed/beyond-scout/640/360",
      kind: "image",
    },
  ];
}
