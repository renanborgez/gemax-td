import type { Entity } from '@/entities/Entity';
import type { ObjectPool } from '@/engine/pool/ObjectPool';
import type { Projectile } from '@/entities/Projectile';

/**
 * Compact-in-place: drop !alive entries from the array.
 */
export function compactInPlace<T extends Entity>(arr: T[]): void {
  let write = 0;
  for (let read = 0; read < arr.length; read++) {
    const e = arr[read]!;
    if (e.alive) arr[write++] = e;
  }
  arr.length = write;
}

/**
 * Compact + release dead projectiles back to their pool.
 *
 * Single-type form: pass a homogeneous pool. Used in tests.
 */
export function compactProjectilesAndReleaseToPool<T extends Projectile>(
  arr: T[],
  pool: ObjectPool<T>,
): void {
  let write = 0;
  for (let read = 0; read < arr.length; read++) {
    const p = arr[read]!;
    if (p.alive) {
      arr[write++] = p;
    } else {
      pool.release(p);
    }
  }
  arr.length = write;
}

/**
 * Mixed-type form: dead projectiles are routed to the right pool by callback.
 * The Engine has three projectile pools (hitscan/ballistic/aoe) but one mixed
 * array, so the caller routes each projectile by `kind`.
 */
export function compactProjectilesAndRelease(
  arr: Projectile[],
  release: (p: Projectile) => void,
): void {
  let write = 0;
  for (let read = 0; read < arr.length; read++) {
    const p = arr[read]!;
    if (p.alive) {
      arr[write++] = p;
    } else {
      release(p);
    }
  }
  arr.length = write;
}
