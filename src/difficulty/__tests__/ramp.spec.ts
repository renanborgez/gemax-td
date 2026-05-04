import { describe, it, expect } from 'vitest';
import { chapterMultipliers } from '@/difficulty/ramp';

describe('ramp', () => {
  it('chapter 0 returns identity', () => {
    expect(chapterMultipliers(0)).toEqual({ hp: 1, speed: 1 });
  });
  it('chapter 5 hp = 1 + 0.07*5 = 1.35', () => {
    expect(chapterMultipliers(5).hp).toBeCloseTo(1.35);
    expect(chapterMultipliers(5).speed).toBeCloseTo(1.20);
  });
  it('caps hp at 2.0 and speed at 1.20', () => {
    const c = chapterMultipliers(50);
    expect(c.hp).toBe(2.0);
    expect(c.speed).toBe(1.20);
  });
  it('rejects negative chapter index', () => {
    expect(() => chapterMultipliers(-1)).toThrow();
  });
});
