import { Tower } from '@/entities/Tower';

/**
 * Cryo Field — passive aura tower. Each sim tick, refreshes a brief `slow`
 * status on every enemy in range. No projectile, no fire-rate cadence; the
 * engine reads `auraSlowStrength` + `range` directly each tick.
 */
export class CryoFieldTower extends Tower {
  /** Slow magnitude applied per tick (0..1; 0.35 = 35% slower). */
  auraSlowStrength: number = 0.35;
  /** Status duration applied each tick (refreshed continuously). */
  auraSlowDuration: number = 0.4;
}
