import type { Entity } from '@/entities/Entity';
import type { ObjectPool } from '@/engine/pool/ObjectPool';
import type { Projectile } from '@/entities/Projectile';

/**
 * Compact-in-place: drop !alive entries from the array.
 * For pooled entities, releases them back to the pool first.
 */
export function compactInPlace<T extends Entity>(arr: T[]): void {
  let write = 0;
  for (let read = 0; read < arr.length; read++) {
    const e = arr[read]!;
    if (e.alive) arr[write++] = e;
  }
  arr.length = write;
}

export function compactProjectilesAndRelease<T extends Projectile>(
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
