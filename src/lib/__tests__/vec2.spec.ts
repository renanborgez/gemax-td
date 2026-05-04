import { describe, it, expect } from 'vitest';
import { v2, add, sub, scale, length, distance, normalize, dot } from '@/lib/vec2';

describe('vec2', () => {
  it('constructs and adds', () => {
    expect(add(v2(1, 2), v2(3, 4))).toEqual({ x: 4, y: 6 });
  });
  it('subtracts and scales', () => {
    expect(sub(v2(5, 5), v2(1, 2))).toEqual({ x: 4, y: 3 });
    expect(scale(v2(2, 3), 2)).toEqual({ x: 4, y: 6 });
  });
  it('computes length and distance', () => {
    expect(length(v2(3, 4))).toBe(5);
    expect(distance(v2(0, 0), v2(3, 4))).toBe(5);
  });
  it('normalizes', () => {
    const n = normalize(v2(3, 4));
    expect(n.x).toBeCloseTo(0.6);
    expect(n.y).toBeCloseTo(0.8);
  });
  it('handles zero-length normalize', () => {
    expect(normalize(v2(0, 0))).toEqual({ x: 0, y: 0 });
  });
  it('computes dot product', () => {
    expect(dot(v2(1, 2), v2(3, 4))).toBe(11);
  });
});
