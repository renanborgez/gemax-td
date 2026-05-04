import { describe, it, expect } from 'vitest';
import { Path } from '@/world/Path';

describe('Path', () => {
  // L-shape: (0,0) → (4,0) → (4,3). Total length: 4 + 3 = 7 (in tile units).
  const p = new Path([
    { col: 0, row: 0 },
    { col: 4, row: 0 },
    { col: 4, row: 3 },
  ], 1);    // tileSize=1 for math simplicity in tests

  it('reports total length', () => {
    expect(p.totalLength).toBeCloseTo(7);
  });

  it('xyAtDistance(0) returns the first waypoint center', () => {
    expect(p.xyAtDistance(0)).toEqual({ x: 0.5, y: 0.5 });
  });

  it('xyAtDistance interpolates along the first segment', () => {
    const xy = p.xyAtDistance(2);
    expect(xy.x).toBeCloseTo(2.5);
    expect(xy.y).toBeCloseTo(0.5);
  });

  it('xyAtDistance handles a corner', () => {
    const xy = p.xyAtDistance(4);
    expect(xy.x).toBeCloseTo(4.5);
    expect(xy.y).toBeCloseTo(0.5);
  });

  it('xyAtDistance interpolates along the second segment', () => {
    const xy = p.xyAtDistance(5.5);
    expect(xy.x).toBeCloseTo(4.5);
    expect(xy.y).toBeCloseTo(2.0);
  });

  it('xyAtDistance clamps past total length', () => {
    const xy = p.xyAtDistance(9999);
    expect(xy.x).toBeCloseTo(4.5);
    expect(xy.y).toBeCloseTo(3.5);
  });

  it('reachedEnd is true at totalLength', () => {
    expect(p.reachedEnd(p.totalLength - 0.0001)).toBe(false);
    expect(p.reachedEnd(p.totalLength)).toBe(true);
  });
});
