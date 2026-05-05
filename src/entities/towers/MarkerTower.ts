import { Tower } from '@/entities/Tower';

/**
 * Marker — debuff applicator. Fires a `marker-dart` projectile that applies
 * a `mark` status to the target. While marked, the target takes
 * `markDamageMult` × incoming damage from EVERY tower (not just the marker).
 * Synergy tower — pairs with high-DPS towers like Sniper or Plasma Cannon.
 */
export class MarkerTower extends Tower {
  /** Damage-taken multiplier applied while marked. 1.25 = +25% damage. */
  markDamageMult: number = 1.25;
  /** Mark duration in seconds. */
  markDuration: number = 4.0;
}
