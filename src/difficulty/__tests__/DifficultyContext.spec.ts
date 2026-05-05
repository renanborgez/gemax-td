import { describe, it, expect } from 'vitest';
import { createDifficultyContext } from '@/difficulty/DifficultyContext';

describe('createDifficultyContext', () => {
  it('combines selector × chapter ramp on hp/speed', () => {
    const ctx = createDifficultyContext({ selector: 'insane', chapterIndex: 5 });
    expect(ctx.enemyHpMult).toBeCloseTo(1.75 * 1.35);
    expect(ctx.enemySpeedMult).toBeCloseTo(1.10 * 1.15);
  });
  it('continues HP past the knee and caps speed at very high chapters', () => {
    const ctx = createDifficultyContext({ selector: 'insane', chapterIndex: 100 });
    // post-knee HP at chapter 100 = 2.05 + 0.04 * (100 - 15) = 5.45
    expect(ctx.enemyHpMult).toBeCloseTo(1.75 * 5.45);
    expect(ctx.enemySpeedMult).toBeCloseTo(1.10 * 1.30);
  });
  it('passes through credits/shard mults from selector only', () => {
    const ctx = createDifficultyContext({ selector: 'hard', chapterIndex: 3 });
    expect(ctx.startCreditsMult).toBe(0.9);
    expect(ctx.shardRewardMult).toBe(1.5);
  });
});
