import { Tower } from '@/entities/Tower';

export class EMPTower extends Tower {
  /** Stun duration applied to every enemy caught in the burst, seconds. */
  stunDuration: number = 0.8;
  /** Burst radius (tiles). Independent of `range` so the firing trigger and
   *  the stun footprint can be tuned separately. */
  stunRadius: number = 2.5;
}
