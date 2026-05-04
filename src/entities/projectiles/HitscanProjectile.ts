import { Projectile } from '@/entities/Projectile';

export class HitscanProjectile extends Projectile {
  /** Resolves on the same tick it was fired. */
  targetEnemyId: string | null = null;
}
