import { describe, it, expect } from 'vitest';
import { movementSystem, type LeakEvent, type DotTickEvent } from '@/engine/systems/movementSystem';
import { Path } from '@/world/Path';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import { freshStatus } from '@/entities/StatusEffect';
import type { StatContext } from '@/entities/getStat';

const ctx: StatContext = { difficulty: { enemyHpMult: 1, enemySpeedMult: 1 }, effects: { towerStatMults: {} } };
const path = new Path([{ col: 0, row: 0 }, { col: 5, row: 0 }], 1);

function worm(): WormEnemy {
  return new WormEnemy({
    id: 'e:1', defKind: 'worm',
    baseStats: { hp: 18, speed: 2, armor: 0 },
    bounty: 4, flying: false, spawnerId: 'main',
  });
}

describe('movementSystem', () => {
  it('advances enemy along path at speed', () => {
    const e = worm();
    const leaks: LeakEvent[] = [], dots: DotTickEvent[] = [];
    movementSystem([e], path, ctx, 0.5, leaks, dots);
    // 0.5 s × 2 tiles/s × tileSize=1 = 1 unit moved
    expect(e.distAlongPath).toBeCloseTo(1);
    expect(e.x).toBeCloseTo(1.5);
  });

  it('marks enemy dead and emits a leak when reaching end', () => {
    const e = worm();
    e.distAlongPath = path.totalLength - 0.01;
    const leaks: LeakEvent[] = [], dots: DotTickEvent[] = [];
    movementSystem([e], path, ctx, 1, leaks, dots);
    expect(e.alive).toBe(false);
    expect(leaks).toEqual([{ enemyId: 'e:1', enemyKind: 'worm' }]);
  });

  it('decays statuses and stages DoT damage', () => {
    const e = worm();
    e.statuses.push(freshStatus({ kind: 'dot', magnitude: 5, duration: 1, appliedByTowerId: 't:1' }));
    const leaks: LeakEvent[] = [], dots: DotTickEvent[] = [];
    movementSystem([e], path, ctx, 0.5, leaks, dots);
    expect(dots).toHaveLength(1);
    expect(dots[0]!.damage).toBeCloseTo(2.5);
    expect(e.statuses[0]!.remaining).toBeCloseTo(0.5);
  });

  it('skips dead enemies', () => {
    const e = worm();
    e.alive = false;
    const start = e.distAlongPath;
    movementSystem([e], path, ctx, 1, [], []);
    expect(e.distAlongPath).toBe(start);
  });
});
