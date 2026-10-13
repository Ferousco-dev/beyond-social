import { type Item, type Keyframe, type Transition } from "./types.ts";

export interface Animated {
  readonly x?: number;
  readonly y?: number;
  readonly scale: number;
  readonly opacity: number;
}

type Prop = "x" | "y" | "scale" | "opacity";

/** The value of one property at a time, gliding between the keyframes that set it. */
function glide(keyframes: readonly Keyframe[], prop: Prop, local: number): number | undefined {
  const set = keyframes.filter((k) => k[prop] !== undefined).sort((a, b) => a.t - b.t);
  if (set.length === 0) return undefined;
  const first = set[0]!;
  const last = set[set.length - 1]!;
  if (local <= first.t) return first[prop];
  if (local >= last.t) return last[prop];
  const after = set.findIndex((k) => k.t > local);
  const from = set[after - 1]!;
  const to = set[after]!;
  const span = to.t - from.t;
  const amount = span === 0 ? 1 : (local - from.t) / span;
  return from[prop]! + (to[prop]! - from[prop]!) * amount;
}

/** An item's animated position, size and opacity `local` seconds after it starts. */
export function animatedAt(item: Item, local: number): Animated {
  const keyframes = "keyframes" in item ? (item.keyframes ?? []) : [];
  return {
    x: glide(keyframes, "x", local),
    y: glide(keyframes, "y", local),
    scale: glide(keyframes, "scale", local) ?? 1,
    opacity: glide(keyframes, "opacity", local) ?? 1,
  };
}

/** How far through its entrance an item is (0 to 1), or null once it has finished. */
export function entranceAt(item: Item, local: number): { readonly type: Transition["type"]; readonly progress: number } | null {
  const transition = "transition" in item ? item.transition : undefined;
  if (!transition || local >= transition.duration) return null;
  return { type: transition.type, progress: Math.max(0, local / transition.duration) };
}
