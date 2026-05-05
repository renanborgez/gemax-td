import { describe, it, expect } from 'vitest';
import { bossHp } from '@/content/bossCurve';
import { ROOTKIT, WRAITH } from '@/content/enemyDefs';

describe('bossHp curve', () => {
  it('chapter 0 baseline is 800', () => {
    expect(bossHp(0)).toBe(800);
  });

  it('matches the existing rootkit boss at chapter 0', () => {
    expect(bossHp(0)).toBe(ROOTKIT.baseStats.hp);
  });

  it('matches the wraith boss at chapter 1', () => {
    expect(bossHp(1)).toBe(WRAITH.baseStats.hp);
  });

  it('grows by ×1.6 per chapter', () => {
    expect(bossHp(1)).toBe(1280);
    expect(bossHp(2)).toBe(2048);
    expect(bossHp(3)).toBe(3277);
  });

  it('is monotonic', () => {
    let prev = bossHp(0);
    for (let c = 1; c <= 10; c++) {
      const cur = bossHp(c);
      expect(cur).toBeGreaterThan(prev);
      prev = cur;
    }
  });

  it('rejects negative chapter index', () => {
    expect(() => bossHp(-1)).toThrow();
  });
});
