import { Projectile } from '@/entities/Projectile';

// Bomb tuning. Single source of truth for the engine's spawn code and the
// renderer's fade math, so a balance change happens in one place.
export const LOGIC_BOMB_RADIUS_TILES = 1.5;
export const LOGIC_BOMB_EXPAND_RATE = 8;       // tiles/sec
export const LOGIC_BOMB_FLIGHT_SPEED = 7;      // tiles/sec
export const LOGIC_BOMB_TTL_SAFETY = 0.2;      // seconds of slack past full expansion

export class AoEPulseProjectile extends Projectile {
  /** Maximum radius (tiles) the pulse expands to before despawn. */
  radius: number = LOGIC_BOMB_RADIUS_TILES;
  /** Current radius. */
  currentRadius: number = 0;
  /** Expansion rate, tiles per second. */
  expandRate: number = LOGIC_BOMB_EXPAND_RATE;
  /** Flight speed, tiles per second. */
  flightSpeed: number = LOGIC_BOMB_FLIGHT_SPEED;
  /** Set of enemy ids already damaged (avoid double-hits in the same pulse). */
  hitEnemyIds: Set<string> = new Set();

  /** Flight phase: bomb is still travelling from tower to target. */
  phase: 'flight' | 'detonate' = 'detonate';
  vx: number = 0;
  vy: number = 0;
  /** Captured target landing point (the bomb does not home — moving targets get missed by design). */
  destX: number = 0;
  destY: number = 0;
  /** Seconds elapsed in the flight phase. */
  flightT: number = 0;
  flightDuration: number = 0;

  override resetForPool(): void {
    super.resetForPool();
    this.radius = LOGIC_BOMB_RADIUS_TILES;
    this.currentRadius = 0;
    this.expandRate = LOGIC_BOMB_EXPAND_RATE;
    this.flightSpeed = LOGIC_BOMB_FLIGHT_SPEED;
    this.hitEnemyIds.clear();
    this.phase = 'detonate';
    this.vx = 0; this.vy = 0;
    this.destX = 0; this.destY = 0;
    this.flightT = 0; this.flightDuration = 0;
  }
}
