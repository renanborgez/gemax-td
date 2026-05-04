import { Projectile } from '@/entities/Projectile';

export class HitscanProjectile extends Projectile {
  /** Resolves on the same tick it was fired. */
  targetEnemyId: string | null = null;
  /** Beam endpoints (tile units) for visualization. */
  fromX: number = 0;
  fromY: number = 0;

  override resetForPool(): void {
    super.resetForPool();
    this.targetEnemyId = null;
    this.fromX = 0;
    this.fromY = 0;
  }
}
