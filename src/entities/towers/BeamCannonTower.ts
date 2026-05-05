import { Tower } from '@/entities/Tower';

/**
 * Beam Cannon — sustained-target ramping DPS. While the beam holds the same
 * enemy, damage scales from 1.0× → `maxRamp`× over `rampSeconds` seconds.
 * Engine maintains `currentRamp` per tower and resets to 1.0 when the
 * target enemy id changes.
 */
export class BeamCannonTower extends Tower {
  /** Last target id the beam was tracking. Reset means ramp resets. */
  lastTargetId: string | null = null;
  /** Current damage multiplier (1.0..maxRamp). */
  currentRamp: number = 1.0;
  /** Cap on ramp multiplier. */
  maxRamp: number = 2.5;
  /** Seconds to reach maxRamp from 1.0× while holding the same target. */
  rampSeconds: number = 3.0;
}
