import { Projectile } from '@/entities/Projectile';

export const MARKER_DART_TTL = 1.6;
export const MARKER_DART_SPEED = 8;

/** Light homing dart fired by the Marker tower; on impact the engine pushes
 *  a `mark` status onto the target. No damage. */
export class MarkerDartProjectile extends Projectile {
  speed: number = MARKER_DART_SPEED;
  vx: number = 0;
  vy: number = 0;
  targetEnemyId: string | null = null;

  override resetForPool(): void {
    super.resetForPool();
    this.speed = MARKER_DART_SPEED;
    this.vx = 0; this.vy = 0;
    this.targetEnemyId = null;
  }
}
