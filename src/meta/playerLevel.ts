/**
 * Account-level XP curve. Cubic shape (Disgaea family) calibrated for a
 * reachable L=500 — see plan §7.3 + code-review calibration. Coefficients
 * are smaller than the original Disgaea reference so cumulative XP stays
 * tractable across the full ladder.
 *
 *   L=10  →    ~280 XP cumulative
 *   L=50  →    ~28K XP
 *   L=100 →   ~204K XP
 *   L=500 →    ~37M XP
 *
 * At the documented `xpRewardForMatch` rates, L=500 lands in ~2,000–4,000
 * matches across a typical mix of difficulties and chapters.
 */

const A = 0.001;
const B = 0.5;
const C = 3;

export function xpForNextLevel(level: number): number {
  if (level < 1) throw new Error('level must be >= 1');
  return Math.round(A * level ** 3 + B * level ** 2 + C * level);
}

/** Closed-form sum: Σ_{k=1..L-1} (A k³ + B k² + C k). */
export function totalXpToReachLevel(level: number): number {
  if (level < 1) throw new Error('level must be >= 1');
  if (level === 1) return 0;
  const n = level - 1;
  const sumK3 = ((n * (n + 1)) / 2) ** 2;
  const sumK2 = (n * (n + 1) * (2 * n + 1)) / 6;
  const sumK1 = (n * (n + 1)) / 2;
  return Math.round(A * sumK3 + B * sumK2 + C * sumK1);
}

export function levelFromXp(totalXp: number): number {
  if (totalXp < 0) throw new Error('totalXp must be >= 0');
  let L = 1;
  while (totalXpToReachLevel(L + 1) <= totalXp) L++;
  return L;
}

export type XpRewardOpts = {
  wavesCleared: number;
  stars: 0 | 1 | 2 | 3;
  chapter: number;
  /** From `SelectorMultipliers.xpRewardMult`. */
  xpRewardMult: number;
};

export function xpRewardForMatch(opts: XpRewardOpts): number {
  const base = 200;
  const perWave = 25 * opts.wavesCleared;
  const starBonus = opts.stars * 500;
  const chapterMult = 1 + 0.2 * opts.chapter;
  return Math.round((base + perWave + starBonus) * chapterMult * opts.xpRewardMult);
}

export type ShardRewardOpts = {
  stars: 0 | 1 | 2 | 3;
  chapter: number;
  /** From `SelectorMultipliers.shardRewardMult`. */
  shardRewardMult: number;
};

export function shardRewardForMatch(opts: ShardRewardOpts): number {
  return Math.round(opts.stars * 10 * opts.shardRewardMult * (1 + 0.05 * opts.chapter));
}
