import { describe, it, expect } from 'vitest';
import { chapterMultipliers } from '@/difficulty/ramp';

describe('ramp', () => {
  it('chapter 0 returns identity', () => {
    expect(chapterMultipliers(0)).toEqual({ hp: 1, speed: 1 });
  });

  it('chapter 5: hp = 1 + 0.07*5 = 1.35; speed = 1 + 0.03*5 = 1.15', () => {
    expect(chapterMultipliers(5).hp).toBeCloseTo(1.35);
    expect(chapterMultipliers(5).speed).toBeCloseTo(1.15);
  });

  it('chapter 15 sits at the HP knee at 2.05', () => {
    expect(chapterMultipliers(15).hp).toBeCloseTo(2.05);
  });

  it('chapter 30: hp continues past the knee at 2.05 + 0.04*15 = 2.65', () => {
    expect(chapterMultipliers(30).hp).toBeCloseTo(2.65);
  });

  it('speed caps at 1.30', () => {
    expect(chapterMultipliers(50).speed).toBe(1.30);
    expect(chapterMultipliers(500).speed).toBe(1.30);
  });

  it('chapter 50: hp = 2.05 + 0.04*35 = 3.45 (under Goal-Defense 5x ceiling)', () => {
    expect(chapterMultipliers(50).hp).toBeCloseTo(3.45);
  });

  it('rejects negative chapter index', () => {
    expect(() => chapterMultipliers(-1)).toThrow();
  });
});
