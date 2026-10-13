import { acceptsItem, endOf, fail, locate, ok, replaceTrack, speedOf, withItem } from "./find.ts";
import { itemSchema, MIN_DURATION, type Asset, type Item, type Keyframe, type Transition, type Project, type Result } from "./types.ts";

/**
 * Every edit is a pure function from a project to a new project, or to a
 * reason it cannot be done. Nothing mutates, so history is just a list of
 * projects and an invalid edit can never leave the timeline half changed.
 */

export function addItem(project: Project, trackId: string, item: Item): Result<Project> {
  const track = project.tracks.find((candidate) => candidate.id === trackId);
  if (!track) return fail("That track does not exist.");
  if (!acceptsItem(track, item)) return fail(`A ${track.kind} track cannot hold a ${item.kind}.`);
  if (locate(project, item.id)) return fail("An item with that id already exists.");
  const next = withItem(track, item);
  return next.ok ? ok(replaceTrack(project, next.value)) : next;
}

export function moveItem(project: Project, itemId: string, start: number, trackId?: string): Result<Project> {
  const found = locate(project, itemId);
  if (!found) return fail("That item does not exist.");
  if (start < 0) return fail("An item cannot start before the beginning.");
  const moved: Item = { ...found.item, start };
  if (trackId === undefined || trackId === found.track.id) {
    const next = withItem(found.track, moved);
    return next.ok ? ok(replaceTrack(project, next.value)) : next;
  }
  const target = project.tracks.find((candidate) => candidate.id === trackId);
  if (!target) return fail("That track does not exist.");
  if (!acceptsItem(target, moved)) return fail(`A ${target.kind} track cannot hold a ${moved.kind}.`);
  const into = withItem(target, moved);
  if (!into.ok) return into;
  const without = { ...found.track, items: found.track.items.filter((item) => item.id !== itemId) };
  return ok(replaceTrack(replaceTrack(project, without), into.value));
}

/** Removes an item. With `ripple`, everything after it on the track closes the gap. */
export function deleteItem(project: Project, itemId: string, ripple = false): Result<Project> {
  const found = locate(project, itemId);
  if (!found) return fail("That item does not exist.");
  const items = found.track.items
    .filter((item) => item.id !== itemId)
    .map((item) => (ripple && item.start >= endOf(found.item) - 1e-9 ? { ...item, start: item.start - found.item.duration } : item));
  return ok(replaceTrack(project, { ...found.track, items }));
}

/**
 * Cuts one item in two at a time on the timeline. The second half keeps the
 * same footage going from the cut, so playing both back to back is unchanged.
 */
export function splitItem(project: Project, itemId: string, at: number, newId: string): Result<Project> {
  const found = locate(project, itemId);
  if (!found) return fail("That item does not exist.");
  const { item } = found;
  if (item.kind === "caption") return fail("Captions cannot be split. Edit the text instead.");
  const hasSource = item.kind === "video" || item.kind === "audio";
  if (at < item.start + MIN_DURATION || at > endOf(item) - MIN_DURATION) return fail("Move the playhead inside the clip to cut it.");
  if (locate(project, newId)) return fail("An item with that id already exists.");
  const first = at - item.start;
  const head: Item = { ...item, duration: first, ...splitKeyframes(item, first).head };
  const rest = splitKeyframes(item, first).tail;
  const tail: Item = hasSource
    ? { ...item, id: newId, start: at, duration: item.duration - first, trimIn: item.trimIn + first * speedOf(item), ...rest }
    : { ...item, id: newId, start: at, duration: item.duration - first, ...rest };
  const next = withItem({ ...found.track, items: found.track.items.filter((i) => i.id !== itemId) }, head);
  if (!next.ok) return next;
  const done = withItem(next.value, tail);
  return done.ok ? ok(replaceTrack(project, done.value)) : done;
}

/** Drags one edge of an item to a time on the timeline. */
export function trimItem(project: Project, itemId: string, edge: "start" | "end", at: number): Result<Project> {
  const found = locate(project, itemId);
  if (!found) return fail("That item does not exist.");
  const { item } = found;
  const hasSource = item.kind === "video" || item.kind === "audio";
  let trimmed: Item;
  if (edge === "end") {
    const duration = at - item.start;
    if (duration < MIN_DURATION) return fail("The clip cannot be shorter than a tenth of a second.");
    if (hasSource && item.trimIn + duration * speedOf(item) > item.sourceDuration + 1e-9) return fail("There is no more footage to extend into.");
    trimmed = { ...item, duration };
  } else {
    const shift = at - item.start;
    const duration = item.duration - shift;
    if (at < 0 || duration < MIN_DURATION) return fail("That would make the clip too short or start before zero.");
    if (hasSource && item.trimIn + shift * speedOf(item) < -1e-9) return fail("There is no earlier footage to extend into.");
    const moved = { ...shiftKeyframes(item, -shift) };
    trimmed = hasSource ? { ...item, ...moved, start: at, duration, trimIn: item.trimIn + shift * speedOf(item) } : { ...item, ...moved, start: at, duration };
  }
  const next = withItem(found.track, trimmed);
  return next.ok ? ok(replaceTrack(project, next.value)) : next;
}

/** Fields an edit may not change: identity and kind, and timing, which have their own operations. */
const FIXED = new Set(["id", "kind", "start", "duration", "trimIn", "sourceDuration", "speed", "keyframes", "transition"]);

/** Changes an item's own settings (text, colour, volume, position). The result must still be a valid item. */
export function updateItem(project: Project, itemId: string, patch: Readonly<Record<string, unknown>>): Result<Project> {
  const found = locate(project, itemId);
  if (!found) return fail("That item does not exist.");
  if (Object.keys(patch).some((key) => FIXED.has(key))) return fail("Timing and identity change through their own edits.");
  const parsed = itemSchema.safeParse({ ...found.item, ...patch });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "That value is not allowed.");
  return ok(replaceTrack(project, { ...found.track, items: found.track.items.map((i) => (i.id === itemId ? parsed.data : i)) }));
}

/**
 * Replaces the captions that fall in a stretch of the timeline with new ones,
 * so generating captions twice for the same clip does not stack them.
 */
export function replaceCaptions(project: Project, from: number, to: number, captions: readonly Item[]): Result<Project> {
  let next: Project = {
    ...project,
    tracks: project.tracks.map((track) =>
      track.kind === "caption" ? { ...track, items: track.items.filter((i) => endOf(i) <= from || i.start >= to) } : track,
    ),
  };
  const track = next.tracks.find((t) => t.kind === "caption");
  if (!track) return fail("This project has no caption track.");
  for (const caption of captions) {
    const added = addItem(next, track.id, caption);
    if (!added.ok) return added;
    next = added.value;
  }
  return ok(next);
}

/** Changes the look of every caption at once. */
export function restyleCaptions(project: Project, style: Readonly<Record<string, unknown>>): Result<Project> {
  let next = project;
  for (const track of project.tracks) {
    for (const item of track.items) {
      if (item.kind !== "caption") continue;
      const changed = updateItem(next, item.id, { style: { ...item.style, ...style } });
      if (!changed.ok) return changed;
      next = changed.value;
    }
  }
  return ok(next);
}

/** Remembers a file in the project so it can be placed again. A file already known is kept as it was. */
export function addAsset(project: Project, asset: Asset): Result<Project> {
  const known = project.assets ?? [];
  if (known.some((a) => a.src === asset.src)) return ok(project);
  if (known.length >= 100) return fail("This project already has 100 files.");
  return ok({ ...project, assets: [...known, asset] });
}

/** Cuts every clip, sound, picture and text under a time at once, like "split all". Captions are left alone. */
export function splitAll(project: Project, at: number, newId: () => string): Result<Project> {
  const targets = project.tracks.flatMap((t) => t.items).filter((i) => i.kind !== "caption" && at > i.start + MIN_DURATION && at < endOf(i) - MIN_DURATION);
  if (targets.length === 0) return fail("Move the playhead over a clip to cut it.");
  let next = project;
  for (const item of targets) {
    const cut = splitItem(next, item.id, at, newId());
    if (!cut.ok) return cut;
    next = cut.value;
  }
  return ok(next);
}

type WithKeyframes = Partial<Record<"keyframes", Keyframe[]>>;

const keyframesOf = (item: Item): Keyframe[] => ("keyframes" in item ? (item.keyframes ?? []) : []);

/** Moves keyframes earlier or later in an item's own time, dropping any pushed before its start. */
function shiftKeyframes(item: Item, by: number): WithKeyframes {
  const kept = keyframesOf(item).map((k) => ({ ...k, t: k.t + by })).filter((k) => k.t >= 0);
  return kept.length > 0 ? { keyframes: kept } : { keyframes: undefined };
}

/** Divides keyframes between the two halves of a cut item. */
function splitKeyframes(item: Item, at: number): { head: WithKeyframes; tail: WithKeyframes } {
  const all = keyframesOf(item);
  const head = all.filter((k) => k.t < at);
  const tail = all.filter((k) => k.t >= at).map((k) => ({ ...k, t: k.t - at }));
  return { head: { keyframes: head.length > 0 ? head : undefined }, tail: { keyframes: tail.length > 0 ? tail : undefined } };
}

/**
 * Changes how fast a clip or sound plays. It covers the same stretch of source,
 * so playing faster makes it shorter on the timeline and slower makes it longer.
 */
export function setSpeed(project: Project, itemId: string, speed: number): Result<Project> {
  const found = locate(project, itemId);
  if (!found) return fail("That item does not exist.");
  const { item } = found;
  if (item.kind !== "video" && item.kind !== "audio") return fail("Only clips and sounds have a speed.");
  if (!(speed >= 0.25 && speed <= 4)) return fail("Speed runs from 0.25 to 4 times.");
  const duration = (item.duration * speedOf(item)) / speed;
  if (duration < MIN_DURATION) return fail("That would make the clip too short.");
  const next = withItem(found.track, { ...item, speed, duration });
  return next.ok ? ok(replaceTrack(project, next.value)) : next;
}

export function setTransition(project: Project, itemId: string, transition: Transition | null): Result<Project> {
  const found = locate(project, itemId);
  if (!found) return fail("That item does not exist.");
  const { item } = found;
  if (item.kind === "audio" || item.kind === "caption") return fail("This kind of item has no entrance.");
  const patched: unknown = { ...item, transition: transition ?? undefined };
  const parsed = itemSchema.safeParse(patched);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "That entrance is not allowed.");
  return ok(replaceTrack(project, { ...found.track, items: found.track.items.map((i) => (i.id === itemId ? parsed.data : i)) }));
}

const SAME_MOMENT = 0.05;

/** Pins values at a moment. Pinning again at nearly the same moment updates that keyframe. */
export function setKeyframe(project: Project, itemId: string, keyframe: Keyframe): Result<Project> {
  const found = locate(project, itemId);
  if (!found) return fail("That item does not exist.");
  const { item } = found;
  if (item.kind === "audio" || item.kind === "caption") return fail("This kind of item cannot be animated.");
  if (keyframe.t < 0 || keyframe.t > item.duration + 1e-9) return fail("Pin it while the playhead is over the item.");
  const others = keyframesOf(item).filter((k) => Math.abs(k.t - keyframe.t) > SAME_MOMENT);
  const keyframes = [...others, keyframe].sort((a, b) => a.t - b.t);
  const parsed = itemSchema.safeParse({ ...item, keyframes });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "That keyframe is not allowed.");
  return ok(replaceTrack(project, { ...found.track, items: found.track.items.map((i) => (i.id === itemId ? parsed.data : i)) }));
}

export function removeKeyframe(project: Project, itemId: string, t: number): Result<Project> {
  const found = locate(project, itemId);
  if (!found) return fail("That item does not exist.");
  const remaining = keyframesOf(found.item).filter((k) => Math.abs(k.t - t) > SAME_MOMENT);
  const parsed = itemSchema.safeParse({ ...found.item, keyframes: remaining.length > 0 ? remaining : undefined });
  if (!parsed.success) return fail("That keyframe cannot be removed.");
  return ok(replaceTrack(project, { ...found.track, items: found.track.items.map((i) => (i.id === itemId ? parsed.data : i)) }));
}
