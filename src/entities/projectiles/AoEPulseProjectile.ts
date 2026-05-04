import { Projectile } from '@/entities/Projectile';

export class AoEPulseProjectile extends Projectile {
  /** Maximum radius (tiles) the pulse expands to before despawn. */
  radius: number = 0;
  /** Current radius. */
  currentRadius: number = 0;
  /** Expansion rate, tiles per second. */
  expandRate: number = 8;
  /** Set of enemy ids already damaged (avoid double-hits in the same pulse). */
  hitEnemyIds: Set<string> = new Set();

  override resetForPool(): void {
    super.resetForPool();
    this.radius = 0;
    this.currentRadius = 0;
    this.hitEnemyIds.clear();
  }
}
