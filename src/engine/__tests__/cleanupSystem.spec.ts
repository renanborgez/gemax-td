import { describe, it, expect } from 'vitest';
import { compactInPlace, compactProjectilesAndRelease } from '@/engine/systems/cleanupSystem';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import { HitscanProjectile } from '@/entities/projectiles/HitscanProjectile';
import { ObjectPool } from '@/engine/pool/ObjectPool';

function worm(id: string): WormEnemy {
  return new WormEnemy({
    id, defKind: 'worm',
    baseStats: { hp: 1, speed: 1, armor: 0 },
    bounty: 1, flying: false, spawnerId: 'main',
  });
}

describe('compactInPlace', () => {
  it('removes !alive entries while preserving order', () => {
    const a = worm('e:1'); const b = worm('e:2'); const c = worm('e:3');
    b.alive = false;
    const arr = [a, b, c];
    compactInPlace(arr);
    expect(arr.map((x) => x.id)).toEqual(['e:1', 'e:3']);
  });
});

describe('compactProjectilesAndRelease', () => {
  it('releases dead projectiles back to the pool', () => {
    const pool = new ObjectPool<HitscanProjectile>({
      create: () => new HitscanProjectile({ id: 'p:0', kind: 'projectile:hitscan-bolt', x: 0, y: 0, damage: 0, sourceTowerId: '', ttl: 0 }),
      reset: (p) => p.resetForPool(),
      initialSize: 0,
    });
    const a = pool.acquire(); a.alive = true;
    const b = pool.acquire(); b.alive = false;
    const arr = [a, b];
    compactProjectilesAndRelease(arr, pool);
    expect(arr).toEqual([a]);
    expect(pool.activeCount).toBe(1);
    expect(pool.freeCount).toBe(1);
  });
});
