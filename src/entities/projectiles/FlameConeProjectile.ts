import { Projectile } from '@/entities/Projectile';

export const FLAME_CONE_TTL = 0.20;

/** Visual cone from the Flamer tower. Damage applied at fire time. The
 *  renderer reads `fromX/fromY/x/y/coneHalfAngle` to draw the splash. */
export class FlameConeProjectile extends Projectile {
  fromX: number = 0;
  fromY: number = 0;
  /** Cone half-angle in radians, copied from the source tower at fire time. */
  coneHalfAngle: number = 0.6;

  override resetForPool(): void {
    super.resetForPool();
    this.fromX = 0; this.fromY = 0;
    this.coneHalfAngle = 0.6;
  }
}
