import { describe, it, expect } from 'vitest';
import { makeIdGen } from '@/lib/id';

describe('makeIdGen', () => {
  it('issues monotonically increasing ids with the prefix', () => {
    const gen = makeIdGen();
    const a = gen('tower');
    const b = gen('tower');
    expect(a).not.toBe(b);
    expect(a.startsWith('tower:')).toBe(true);
    expect(b.startsWith('tower:')).toBe(true);
  });
  it('uses independent counters per prefix', () => {
    const gen = makeIdGen();
    const t = gen('tower');
    const e = gen('enemy');
    expect(t).toBe('tower:1');
    expect(e).toBe('enemy:1');
  });
});
