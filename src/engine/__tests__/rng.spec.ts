import { describe, it, expect } from 'vitest';
import { SeededRng } from '@/engine/rng';

describe('SeededRng', () => {
  it('produces deterministic sequences for the same seed', () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });
  it('produces different sequences for different seeds', () => {
    const a = new SeededRng(1).next();
    const b = new SeededRng(2).next();
    expect(a).not.toBe(b);
  });
  it('returns floats in [0, 1)', () => {
    const r = new SeededRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('range(n) returns int in [0, n)', () => {
    const r = new SeededRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.range(10);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
    }
  });
  it('chance(p) returns true with frequency near p', () => {
    const r = new SeededRng(123);
    let hits = 0;
    for (let i = 0; i < 10000; i++) if (r.chance(0.25)) hits++;
    expect(hits).toBeGreaterThan(2200);
    expect(hits).toBeLessThan(2800);
  });
});
