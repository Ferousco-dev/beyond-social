import type { ChunkScore } from "../schema/scoring";

const DAY_MS = 86_400_000;
const DEFAULT_HALF_LIFE_DAYS = 30;

/**
 * Exponential time-decay of popularity, run periodically by the training job.
 * Without decay, chunks that were popular a year ago would outrank fresh
 * on-trend knowledge forever. Quality (the Beta posterior) is deliberately NOT
 * decayed: a well-established quality signal should persist; only the
 * recency-sensitive popularity term fades.
 */
export function decayPopularity(
  score: ChunkScore,
  now: string,
  halfLifeDays: number = DEFAULT_HALF_LIFE_DAYS,
): ChunkScore {
  if (score.lastUsedAt === null) return score;
  const elapsedDays = (new Date(now).getTime() - new Date(score.lastUsedAt).getTime()) / DAY_MS;
  if (elapsedDays <= 0) return score;
  const factor = Math.pow(0.5, elapsedDays / halfLifeDays);
  return { ...score, popularity: score.popularity * factor, updatedAt: now };
}

/**
 * Deprecation candidacy: a chunk with enough evidence but a low posterior mean
 * is a drag on quality and should be reviewed for retirement. Returns true only
 * once confidence is high enough that the low score is trustworthy.
 */
export function isDeprecationCandidate(score: ChunkScore, floor = 0.35): boolean {
  return score.confidence >= 0.6 && score.qualityScore < floor;
}
