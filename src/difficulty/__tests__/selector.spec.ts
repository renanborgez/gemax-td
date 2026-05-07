import { describe, it, expect } from 'vitest';
import { getSelectorMults, SELECTOR_MULTS } from '@/difficulty/selector';

describe('selector', () => {
  it('Normal HP identity, speed globally tuned down', () => {
    expect(getSelectorMults('normal')).toEqual({
      enemyHpMult: 1, enemySpeedMult: 0.65, startCreditsMult: 1, shardRewardMult: 1,
    });
  });
  it('Insane matches the spec table', () => {
    const s = getSelectorMults('insane');
    expect(s.enemyHpMult).toBe(1.75);
    expect(s.enemySpeedMult).toBe(0.715);
    expect(s.shardRewardMult).toBe(2.5);
  });
  it('Easy has the credit buff and matches normal speed', () => {
    const s = getSelectorMults('easy');
    expect(s.enemySpeedMult).toBe(0.65);
    expect(s.startCreditsMult).toBe(1.15);
  });
  it('all four difficulties enumerated', () => {
    expect(Object.keys(SELECTOR_MULTS).sort()).toEqual(['easy', 'hard', 'insane', 'normal']);
  });
});
