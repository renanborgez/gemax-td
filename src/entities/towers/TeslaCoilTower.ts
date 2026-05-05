import { Tower } from '@/entities/Tower';

export class TeslaCoilTower extends Tower {
  /** Number of enemies hit including the primary target. */
  chainCount: number = 3;
  /** Damage multiplier applied per chain jump (compounded). */
  chainFalloff: number = 0.65;
  /** Max distance (tiles) per chain jump from the previous link. */
  chainJumpRadius: number = 2.2;
}
