import { Projectile } from '@/entities/Projectile';

export const EMP_BURST_TTL = 0.45;
export const EMP_BURST_EXPAND_RATE = 12; // tiles/sec

/**
 * Visual-only entity representing an EMP pulse. Damage and stun are applied
 * at fire-time by the engine — this class exists so the renderer can draw
 * an expanding ring without polling sim state. Pool-backed.
 */
export class EMPBurstProjectile extends Projectile {
  /** Maximum radius the ring expands to (tiles). */
  radius: number = 0;
  /** Current radius (tiles). */
  currentRadius: number = 0;
  /** Expansion rate (tiles/sec). */
  expandRate: number = EMP_BURST_EXPAND_RATE;

  override resetForPool(): void {
    super.resetForPool();
    this.radius = 0;
    this.currentRadius = 0;
    this.expandRate = EMP_BURST_EXPAND_RATE;
  }
}
