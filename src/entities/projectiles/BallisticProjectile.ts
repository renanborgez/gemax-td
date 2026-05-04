import { Projectile } from '@/entities/Projectile';

export class BallisticProjectile extends Projectile {
  vx: number = 0;
  vy: number = 0;
  targetEnemyId: string | null = null;
  speed: number = 6; // tiles/sec

  override resetForPool(): void {
    super.resetForPool();
    this.vx = 0; this.vy = 0; this.targetEnemyId = null;
  }
}
