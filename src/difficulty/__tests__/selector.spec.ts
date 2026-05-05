import { describe, it, expect } from 'vitest';
import { getSelectorMults, SELECTOR_MULTS } from '@/difficulty/selector';

describe('selector', () => {
  it('Normal is the identity', () => {
    expect(getSelectorMults('normal')).toEqual({
      enemyHpMult: 1, enemySpeedMult: 1, startCreditsMult: 1, shardRewardMult: 1, xpRewardMult: 1,
    });
  });
  it('Insane matches the spec table', () => {
    const s = getSelectorMults('insane');
    expect(s.enemyHpMult).toBe(1.75);
    expect(s.enemySpeedMult).toBe(1.10);
    expect(s.shardRewardMult).toBe(2.5);
  });
  it('Easy has only the credit buff (speed identity)', () => {
    const s = getSelectorMults('easy');
    expect(s.enemySpeedMult).toBe(1.0);
    expect(s.startCreditsMult).toBe(1.15);
  });
  it('all four difficulties enumerated', () => {
    expect(Object.keys(SELECTOR_MULTS).sort()).toEqual(['easy', 'hard', 'insane', 'normal']);
  });
});
