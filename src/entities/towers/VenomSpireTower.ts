import { Tower } from '@/entities/Tower';

export class VenomSpireTower extends Tower {
  /** Damage per second from the poison DoT applied on hit. */
  dotDps: number = 8;
  /** Duration in seconds the poison persists on the target. */
  dotDuration: number = 3.0;
}
