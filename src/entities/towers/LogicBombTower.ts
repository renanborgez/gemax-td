import { Tower } from '@/entities/Tower';

export class LogicBombTower extends Tower {
  /** Radius of AoE pulse on detonation, in tiles. */
  blastRadius: number = 1.5;
}
