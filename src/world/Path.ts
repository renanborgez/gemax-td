import { type Vec2 } from '@/lib/vec2';
import { type GridCoord } from '@/lib/types';

type Segment = {
  start: Vec2;
  end: Vec2;
  length: number;
  cumulativeStart: number;     // distance from path origin to segment.start
};

/**
 * A polyline through grid cell centers. distAlongPath ∈ [0, totalLength]
 * maps to a (world) xy via O(log N) binary search across segments.
 */
export class Path {
  private segments: Segment[] = [];
  readonly totalLength: number;
  readonly tileSize: number;

  constructor(waypoints: readonly GridCoord[], tileSize: number) {
    if (waypoints.length < 2) throw new Error('Path needs at least 2 waypoints');
    this.tileSize = tileSize;

    let cumulative = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = this.cellCenter(waypoints[i]!);
      const b = this.cellCenter(waypoints[i + 1]!);
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      this.segments.push({ start: a, end: b, length: len, cumulativeStart: cumulative });
      cumulative += len;
    }
    this.totalLength = cumulative;
  }

  private cellCenter(g: GridCoord): Vec2 {
    return {
      x: (g.col + 0.5) * this.tileSize,
      y: (g.row + 0.5) * this.tileSize,
    };
  }

  xyAtDistance(d: number): Vec2 {
    if (d <= 0) return this.segments[0]!.start;
    if (d >= this.totalLength) return this.segments[this.segments.length - 1]!.end;
    // Binary search for the segment containing d.
    let lo = 0, hi = this.segments.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      const s = this.segments[mid]!;
      if (d < s.cumulativeStart) hi = mid - 1;
      else if (d >= s.cumulativeStart + s.length) lo = mid + 1;
      else { lo = hi = mid; }
    }
    const seg = this.segments[lo]!;
    const t = (d - seg.cumulativeStart) / seg.length;
    return {
      x: seg.start.x + (seg.end.x - seg.start.x) * t,
      y: seg.start.y + (seg.end.y - seg.start.y) * t,
    };
  }

  reachedEnd(d: number): boolean {
    return d >= this.totalLength;
  }
}
