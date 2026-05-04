import { Tower } from '@/entities/Tower';

export class ICELanceTower extends Tower {
  /** Freeze duration applied on hit, in seconds. */
  freezeDuration: number = 1.0;
}
