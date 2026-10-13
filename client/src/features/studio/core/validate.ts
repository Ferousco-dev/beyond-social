import { acceptsItem, overlaps } from "./find.ts";
import { projectSchema, type Project, type Result } from "./types.ts";

/**
 * Reads a stored document. The shape is checked first, then the rules the
 * schema cannot express: items sit on a track that holds their kind, ids are
 * unique across the project, and nothing overlaps on a track.
 */
export function parseProject(input: unknown): Result<Project> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "This project could not be read." };
  const project = withStandardTracks(parsed.data);
  const seen = new Set<string>();
  for (const track of project.tracks) {
    for (const [index, item] of track.items.entries()) {
      if (seen.has(item.id)) return { ok: false, error: "Two items share an id." };
      seen.add(item.id);
      if (!acceptsItem(track, item)) return { ok: false, error: `A ${track.kind} track holds a ${item.kind}.` };
      if (track.items.slice(index + 1).some((other) => overlaps(item, other))) return { ok: false, error: "Items overlap on a track." };
    }
  }
  return { ok: true, value: project };
}

/** Projects saved before a kind of track existed gain an empty one. */
function withStandardTracks(project: Project): Project {
  if (project.tracks.some((t) => t.kind === "text")) return project;
  return { ...project, tracks: [{ id: "text", kind: "text", items: [] }, ...project.tracks] };
}

export function emptyProject(): Project {
  return {
    version: 1,
    width: 1080,
    height: 1920,
    fps: 30,
    assets: [],
    tracks: [
      { id: "text", kind: "text", items: [] },
      { id: "captions", kind: "caption", items: [] },
      { id: "overlay", kind: "overlay", items: [] },
      { id: "video", kind: "video", items: [] },
      { id: "audio", kind: "audio", items: [] },
    ],
  };
}
