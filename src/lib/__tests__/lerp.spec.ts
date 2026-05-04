import { describe, it, expect } from 'vitest';
import { lerp, clamp, smoothstep } from '@/lib/lerp';

describe('lerp', () => {
  it('linearly interpolates', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });
});

describe('clamp', () => {
  it('clamps below min', () => { expect(clamp(-1, 0, 10)).toBe(0); });
  it('clamps above max', () => { expect(clamp(11, 0, 10)).toBe(10); });
  it('passes within range', () => { expect(clamp(5, 0, 10)).toBe(5); });
});

describe('smoothstep', () => {
  it('returns 0 at edge0', () => { expect(smoothstep(0, 1, 0)).toBe(0); });
  it('returns 1 at edge1', () => { expect(smoothstep(0, 1, 1)).toBe(1); });
  it('returns 0.5 at midpoint', () => { expect(smoothstep(0, 1, 0.5)).toBe(0.5); });
});
