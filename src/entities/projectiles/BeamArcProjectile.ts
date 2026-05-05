import { Projectile } from '@/entities/Projectile';

export const BEAM_ARC_TTL = 0.10;

/** Visual beam from a Beam Cannon tower. Damage is applied at fire time;
 *  this entity exists only so the renderer can draw the line for a tick. */
export class BeamArcProjectile extends Projectile {
  fromX: number = 0;
  fromY: number = 0;
  /** Ramp factor at the moment of fire (1.0..maxRamp); used to render the
   *  beam thicker / brighter as the cannon stabilizes on a target. */
  rampFactor: number = 1;

  override resetForPool(): void {
    super.resetForPool();
    this.fromX = 0; this.fromY = 0;
    this.rampFactor = 1;
  }
}
