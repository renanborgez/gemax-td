import type { Difficulty } from '@/content/types';

export type SelectorMultipliers = {
  enemyHpMult: number;
  enemySpeedMult: number;
  startCreditsMult: number;
  shardRewardMult: number;
  /** XP reward multiplier — scales account-XP gain at match end. */
  xpRewardMult: number;
};

export const SELECTOR_MULTS: Readonly<Record<Difficulty, SelectorMultipliers>> = {
  easy:   { enemyHpMult: 0.80, enemySpeedMult: 1.00, startCreditsMult: 1.15, shardRewardMult: 0.5, xpRewardMult: 0.6 },
  normal: { enemyHpMult: 1.00, enemySpeedMult: 1.00, startCreditsMult: 1.00, shardRewardMult: 1.0, xpRewardMult: 1.0 },
  hard:   { enemyHpMult: 1.35, enemySpeedMult: 1.10, startCreditsMult: 0.90, shardRewardMult: 1.5, xpRewardMult: 1.5 },
  insane: { enemyHpMult: 1.75, enemySpeedMult: 1.10, startCreditsMult: 0.85, shardRewardMult: 2.5, xpRewardMult: 2.5 },
};

export function getSelectorMults(d: Difficulty): SelectorMultipliers {
  return SELECTOR_MULTS[d];
}
