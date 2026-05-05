import { Tower } from '@/entities/Tower';

/**
 * Mortar — late-game AoE tower. Long-range bomb with larger blast radius
 * than Logic Bomb. Reuses the `aoe-pulse` projectile but with bigger
 * damage and radius set on the tower instance.
 */
export class MortarTower extends Tower {
  /** Override blast radius (tiles) — larger than Logic Bomb. */
  blastRadius: number = 2.4;
}
