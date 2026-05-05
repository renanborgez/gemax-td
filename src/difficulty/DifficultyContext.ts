import type { Difficulty } from '@/content/types';
import { getSelectorMults } from '@/difficulty/selector';
import { chapterMultipliers } from '@/difficulty/ramp';

export type DifficultyContext = {
  selector: Difficulty;
  chapterIndex: number;
  enemyHpMult: number;
  enemySpeedMult: number;
  startCreditsMult: number;
  shardRewardMult: number;
  xpRewardMult: number;
};

export function createDifficultyContext(opts: {
  selector: Difficulty;
  chapterIndex: number;
}): DifficultyContext {
  const sel = getSelectorMults(opts.selector);
  const ch = chapterMultipliers(opts.chapterIndex);
  return {
    selector: opts.selector,
    chapterIndex: opts.chapterIndex,
    enemyHpMult: sel.enemyHpMult * ch.hp,
    enemySpeedMult: sel.enemySpeedMult * ch.speed,
    startCreditsMult: sel.startCreditsMult,
    shardRewardMult: sel.shardRewardMult,
    xpRewardMult: sel.xpRewardMult,
  };
}
