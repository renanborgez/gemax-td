import { describe, it, expect } from 'vitest';
import { shardRewardForMatch } from '@/meta/playerLevel';

describe('shardRewardForMatch', () => {
  it('zero stars → zero shards', () => {
    expect(shardRewardForMatch({ stars: 0, chapter: 0, shardRewardMult: 1 })).toBe(0);
  });

  it('Normal chapter 0 with 3 stars → 30', () => {
    expect(shardRewardForMatch({ stars: 3, chapter: 0, shardRewardMult: 1 })).toBe(30);
  });

  it('chapter scaling adds 5% per chapter', () => {
    const c0 = shardRewardForMatch({ stars: 3, chapter: 0, shardRewardMult: 1 });
    const c4 = shardRewardForMatch({ stars: 3, chapter: 4, shardRewardMult: 1 });
    expect(c4).toBe(Math.round(c0 * 1.2));
  });

  it('selector multiplier stacks linearly', () => {
    const baseline = shardRewardForMatch({ stars: 3, chapter: 0, shardRewardMult: 1 });
    const insane = shardRewardForMatch({ stars: 3, chapter: 0, shardRewardMult: 2.5 });
    expect(insane).toBe(Math.round(baseline * 2.5));
  });
});
