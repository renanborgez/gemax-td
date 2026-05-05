import { Tower } from '@/entities/Tower';

/**
 * Flamer — short-range cone splash. On fire, hits up to `maxConeTargets`
 * enemies inside a forward cone defined by `coneHalfAngle` radians from the
 * tower-to-primary-target vector, capped by `range`.
 */
export class FlamerTower extends Tower {
  /** Maximum enemies hit per pulse (including primary). */
  maxConeTargets: number = 4;
  /** Half-angle of the cone, radians. ~0.6 = ~70° total cone. */
  coneHalfAngle: number = 0.6;
}
