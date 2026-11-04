/** 83.4 becomes "01:23.4". */
export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${rest.toFixed(1).padStart(4, "0")}`;
}

export const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

/** The snap point within `threshold` of `time`, or `time` itself. */
export function snapTo(time: number, points: readonly number[], threshold: number): number {
  let best = time;
  let distance = threshold;
  for (const point of points) {
    const gap = Math.abs(point - time);
    if (gap < distance) {
      best = point;
      distance = gap;
    }
  }
  return best;
}

export function makeId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}
