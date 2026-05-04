import { describe, it, expect } from 'vitest';
import { createDifficultyContext } from '@/difficulty/DifficultyContext';

describe('createDifficultyContext', () => {
  it('combines selector × chapter ramp on hp/speed', () => {
    const ctx = createDifficultyContext({ selector: 'insane', chapterIndex: 5 });
    expect(ctx.enemyHpMult).toBeCloseTo(1.75 * 1.35);
    expect(ctx.enemySpeedMult).toBeCloseTo(1.10 * 1.20);
  });
  it('respects soft cap at very high chapters', () => {
    const ctx = createDifficultyContext({ selector: 'insane', chapterIndex: 100 });
    expect(ctx.enemyHpMult).toBeCloseTo(1.75 * 2.0);
    expect(ctx.enemySpeedMult).toBeCloseTo(1.10 * 1.20);
  });
  it('passes through credits/shard mults from selector only', () => {
    const ctx = createDifficultyContext({ selector: 'hard', chapterIndex: 3 });
    expect(ctx.startCreditsMult).toBe(0.9);
    expect(ctx.shardRewardMult).toBe(1.5);
  });
});
