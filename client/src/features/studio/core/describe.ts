import { endOf, projectDuration } from "./find.ts";
import { type Project } from "./types.ts";

/**
 * A compact description of the project for the assistant: what is on the
 * timeline, with the ids it needs to refer to things. Long text is shortened
 * so the description stays small however big the project is.
 */
export function describeProject(project: Project, playhead: number, notes: Readonly<Record<string, string>> = {}): string {
  const round = (n: number): number => Math.round(n * 100) / 100;
  const items = project.tracks.flatMap((track) =>
    track.items.map((item) => ({
      id: item.id,
      kind: item.kind,
      track: track.id,
      start: round(item.start),
      end: round(endOf(item)),
      ...(item.kind === "caption" || item.kind === "text" ? { text: item.text.slice(0, 80) } : {}),
      ...((item.kind === "video" || item.kind === "audio") && project.assets?.find((a) => a.src === item.src)?.name ? { name: project.assets.find((a) => a.src === item.src)?.name } : {}),
      ...(notes[item.id] ? { notes: notes[item.id] } : {}),
      ...(item.kind === "video" || item.kind === "audio" ? { volume: item.volume, sourceSeconds: round(item.sourceDuration), trimIn: round(item.trimIn) } : {}),
    })),
  );
  return JSON.stringify({ playhead: round(playhead), duration: round(projectDuration(project)), items: items.slice(0, 120) });
}
