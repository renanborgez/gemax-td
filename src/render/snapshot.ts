import type { World } from '@/world/World';
import type { AoEPulseProjectile } from '@/entities/projectiles/AoEPulseProjectile';
import type { HitscanProjectile } from '@/entities/projectiles/HitscanProjectile';
import type { TracerRoundProjectile } from '@/entities/projectiles/TracerRoundProjectile';
import type { ChainArcProjectile, ChainSegment } from '@/entities/projectiles/ChainArcProjectile';

export type EnemySnap = { x: number; y: number; defKind: string; hp: number; maxHp: number };
export type TowerSnap = { id: string; x: number; y: number; defKind: string; level: number };
export type ProjectileSnap = {
  x: number; y: number; kind: string;
  /** AoE pulse: current expanded radius (tiles). 0 for other kinds. */
  currentRadius: number;
  /** Hitscan / tracer beam origin (tiles). 0 for non-beam projectiles. */
  fromX: number; fromY: number;
  /** Bomb (aoe-pulse) lifecycle phase. null for non-bomb projectiles. */
  bombPhase: 'flight' | 'detonate' | null;
  /** 0..1 progress through flight; only meaningful when bombPhase === 'flight'. */
  flightProgress: number;
  /** Chain-arc segments (tiles). Empty for non-chain projectiles. */
  chainSegments: readonly ChainSegment[];
  /** Remaining seconds until despawn — used by short-lived FX to fade out. */
  ttl: number;
};
export type BuildHintSnap = { col: number; row: number; valid: boolean } | null;
export type RangeSnap = { x: number; y: number; r: number } | null;

/**
 * Per-frame snapshot consumed by Skia layers via SharedValue. Towers are NOT
 * here — they don't move and are bridged separately on tower-placed/sold/upgraded
 * events to avoid waking up tower-render worklets every animation frame.
 */
export type WorldSnapshot = {
  enemies: EnemySnap[];
  projectiles: ProjectileSnap[];
};

export const EMPTY_SNAPSHOT: WorldSnapshot = {
  enemies: [], projectiles: [],
};

const EMPTY_CHAIN_SEGMENTS: readonly ChainSegment[] = [];

// NOTE: Reanimated freezes objects assigned to a SharedValue (in __DEV__ at
// least), so we cannot reuse a buffer across frames. Allocate fresh each
// snapshot.
export function buildSnapshot(world: World): WorldSnapshot {
  const enemies: EnemySnap[] = [];
  for (const e of world.entities.enemies) {
    if (!e.alive) continue;
    enemies.push({ x: e.x, y: e.y, defKind: e.defKind, hp: e.hp, maxHp: e.maxHp });
  }
  const projectiles: ProjectileSnap[] = [];
  for (const p of world.entities.projectiles) {
    if (!p.alive) continue;
    let cr = 0;
    let bombPhase: 'flight' | 'detonate' | null = null;
    let flightProgress = 0;
    if (p.kind === 'projectile:aoe-pulse') {
      const ap = p as AoEPulseProjectile;
      cr = ap.currentRadius;
      bombPhase = ap.phase;
      if (ap.phase === 'flight' && ap.flightDuration > 0) {
        flightProgress = ap.flightT / ap.flightDuration;
      }
    }
    let fromX = 0, fromY = 0;
    if (p.kind === 'projectile:hitscan-bolt') {
      const hp = p as HitscanProjectile;
      fromX = hp.fromX; fromY = hp.fromY;
    } else if (p.kind === 'projectile:tracer-round') {
      const tp = p as TracerRoundProjectile;
      fromX = tp.fromX; fromY = tp.fromY;
    }
    let chainSegments: readonly ChainSegment[] = EMPTY_CHAIN_SEGMENTS;
    if (p.kind === 'projectile:chain-arc') {
      // Slice (not deep copy) — segments are plain objects already in pool storage,
      // we just need a frozen array reference for the SharedValue.
      chainSegments = (p as ChainArcProjectile).segments.slice();
    }
    projectiles.push({
      x: p.x, y: p.y, kind: p.kind,
      currentRadius: cr, fromX, fromY,
      bombPhase, flightProgress,
      chainSegments,
      ttl: p.ttl,
    });
  }
  return { enemies, projectiles };
}

/**
 * Tower list rebuilt only on tower mutation events (placed/sold/upgraded).
 * Returned to React state — no worklet, no per-frame churn.
 */
export function snapshotTowers(world: World): TowerSnap[] {
  const out: TowerSnap[] = [];
  for (const t of world.entities.towers) {
    if (!t.alive) continue;
    out.push({ id: t.id, x: t.x, y: t.y, defKind: t.defKind, level: t.level });
  }
  return out;
}

export function rangeFromSelection(world: World): RangeSnap {
  const t = world.selection.tower;
  if (!t || !t.alive) return null;
  return { x: t.x, y: t.y, r: t.base.range };
}
