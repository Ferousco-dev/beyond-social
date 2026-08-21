import { isVideo, type Project } from "./types";

/**
 * Refreshing the playable links on a saved timeline.
 *
 * A clip's `sourceUrl` is a signed link into the private `renders` bucket, and
 * it expires an hour after it is minted. Autosave writes the whole project back
 * verbatim, so a document saved yesterday carries yesterday's links: every clip
 * pointed at a URL that no longer resolved and the preview came up empty. The
 * durable fact is `generationId`, so the link is re-derived from that on every
 * load rather than trusted from the document.
 *
 * A clip whose generation has since been deleted loses its source instead of
 * keeping a dead one. The preview already knows how to show a clip with no
 * render behind it, which is a truthful placeholder rather than a black frame.
 */
export function withFreshSources(
  project: Project,
  urlByGeneration: ReadonlyMap<string, string>,
): Project {
  return {
    ...project,
    tracks: project.tracks.map((track) => {
      if (track.kind !== "video") return track;

      return {
        ...track,
        items: track.items.map((item) => {
          if (!isVideo(item) || item.generationId === undefined) return item;

          const fresh = urlByGeneration.get(item.generationId);
          // Spread rather than assigning undefined: `sourceUrl` is optional and
          // the schema rejects an explicit undefined on the way back to save.
          const { sourceUrl: _stale, ...rest } = item;
          return fresh ? { ...rest, sourceUrl: fresh } : rest;
        }),
      };
    }),
  };
}
