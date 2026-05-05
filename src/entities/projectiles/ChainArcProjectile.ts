import { Projectile } from '@/entities/Projectile';

export type ChainSegment = { fromX: number; fromY: number; toX: number; toY: number };

export const CHAIN_ARC_TTL = 0.12;

export class ChainArcProjectile extends Projectile {
  segments: ChainSegment[] = [];

  override resetForPool(): void {
    super.resetForPool();
    this.segments.length = 0;
  }
}
