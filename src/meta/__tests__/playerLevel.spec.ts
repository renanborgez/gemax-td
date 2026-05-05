import { describe, it, expect } from 'vitest';
import {
  levelFromXp,
  totalXpToReachLevel,
  xpForNextLevel,
  xpRewardForMatch,
} from '@/meta/playerLevel';

describe('xpForNextLevel', () => {
  it('rejects level < 1', () => {
    expect(() => xpForNextLevel(0)).toThrow();
  });

  it('matches the calibrated cubic at known levels', () => {
    // 0.001 L^3 + 0.5 L^2 + 3 L
    expect(xpForNextLevel(1)).toBe(4);     // round(0.001 + 0.5 + 3 = 3.501)
    expect(xpForNextLevel(10)).toBe(81);   // 1 + 50 + 30
    expect(xpForNextLevel(100)).toBe(6300); // 1000 + 5000 + 300
  });

  it('grows monotonically', () => {
    let prev = 0;
    for (let L = 1; L <= 50; L++) {
      const x = xpForNextLevel(L);
      expect(x).toBeGreaterThan(prev);
      prev = x;
    }
  });
});

describe('totalXpToReachLevel', () => {
  it('level 1 starts at 0', () => {
    expect(totalXpToReachLevel(1)).toBe(0);
  });

  it('matches the running sum at L=10', () => {
    let sum = 0;
    for (let k = 1; k <= 9; k++) sum += 0.001 * k ** 3 + 0.5 * k ** 2 + 3 * k;
    expect(totalXpToReachLevel(10)).toBe(Math.round(sum));
  });

  it('cumulative at L=100 sits in the ~204K range', () => {
    const v = totalXpToReachLevel(100);
    expect(v).toBeGreaterThan(200_000);
    expect(v).toBeLessThan(210_000);
  });

  it('cumulative at L=500 lands near ~37M (reachable in a few thousand matches)', () => {
    const v = totalXpToReachLevel(500);
    expect(v).toBeGreaterThan(35_000_000);
    expect(v).toBeLessThan(40_000_000);
  });
});

describe('levelFromXp', () => {
  it('0 XP → level 1', () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it('snaps to the highest L whose threshold is <= xp', () => {
    expect(levelFromXp(totalXpToReachLevel(10))).toBe(10);
    expect(levelFromXp(totalXpToReachLevel(10) - 1)).toBe(9);
    expect(levelFromXp(totalXpToReachLevel(10) + 1)).toBe(10);
  });
});

describe('xpRewardForMatch', () => {
  it('Normal chapter 0 with 3-star 20-wave: predictable baseline', () => {
    // (200 + 25*20 + 3*500) * 1.0 * 1.0 = 2200
    expect(xpRewardForMatch({ wavesCleared: 20, stars: 3, chapter: 0, xpRewardMult: 1 })).toBe(2200);
  });

  it('Chapter scaling adds 20% per chapter', () => {
    const c0 = xpRewardForMatch({ wavesCleared: 20, stars: 3, chapter: 0, xpRewardMult: 1 });
    const c5 = xpRewardForMatch({ wavesCleared: 20, stars: 3, chapter: 5, xpRewardMult: 1 });
    expect(c5).toBe(Math.round(c0 * 2));
  });

  it('Insane multiplies by 2.5', () => {
    const normal = xpRewardForMatch({ wavesCleared: 20, stars: 3, chapter: 0, xpRewardMult: 1 });
    const insane = xpRewardForMatch({ wavesCleared: 20, stars: 3, chapter: 0, xpRewardMult: 2.5 });
    expect(insane).toBe(normal * 2.5);
  });

  it('zero stars still grants base + per-wave', () => {
    expect(xpRewardForMatch({ wavesCleared: 5, stars: 0, chapter: 0, xpRewardMult: 1 })).toBe(325);
  });
});
