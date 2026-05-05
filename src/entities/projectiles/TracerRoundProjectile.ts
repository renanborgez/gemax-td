import { Projectile } from '@/entities/Projectile';

export class TracerRoundProjectile extends Projectile {
  targetEnemyId: string | null = null;
  fromX: number = 0;
  fromY: number = 0;

  override resetForPool(): void {
    super.resetForPool();
    this.targetEnemyId = null;
    this.fromX = 0;
    this.fromY = 0;
  }
}
