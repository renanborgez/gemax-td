import { Projectile } from '@/entities/Projectile';

export const BULLET_TTL = 1.4;
export const BULLET_SPEED = 11;

/** Lightweight kinetic round fired by Bullet Turret + Machine Gun. Single
 *  target, applies its `damage` value on impact, no special on-hit effects. */
export class BulletProjectile extends Projectile {
  speed: number = BULLET_SPEED;
  vx: number = 0;
  vy: number = 0;
  targetEnemyId: string | null = null;

  override resetForPool(): void {
    super.resetForPool();
    this.speed = BULLET_SPEED;
    this.vx = 0; this.vy = 0;
    this.targetEnemyId = null;
  }
}
