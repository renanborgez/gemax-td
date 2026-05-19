import type { Difficulty } from '@/content/types';

export type SelectorMultipliers = {
  enemyHpMult: number;
  enemySpeedMult: number;
  startCreditsMult: number;
  shardRewardMult: number;
};

export const SELECTOR_MULTS: Readonly<Record<Difficulty, SelectorMultipliers>> = {
  easy:   { enemyHpMult: 0.80, enemySpeedMult: 0.65,  startCreditsMult: 1.15, shardRewardMult: 0.5 },
  normal: { enemyHpMult: 1.00, enemySpeedMult: 0.65,  startCreditsMult: 1.00, shardRewardMult: 1.0 },
  hard:   { enemyHpMult: 1.35, enemySpeedMult: 0.715, startCreditsMult: 0.90, shardRewardMult: 1.5 },
  insane: { enemyHpMult: 1.75, enemySpeedMult: 0.715, startCreditsMult: 0.85, shardRewardMult: 2.5 },
};

export function getSelectorMults(d: Difficulty): SelectorMultipliers {
  return SELECTOR_MULTS[d];
}
