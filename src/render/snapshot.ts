import type { World } from '@/world/World';
import type { AoEPulseProjectile } from '@/entities/projectiles/AoEPulseProjectile';
import type { HitscanProjectile } from '@/entities/projectiles/HitscanProjectile';

export type EnemySnap = { x: number; y: number; defKind: string; hp: number; maxHp: number };
export type TowerSnap = { x: number; y: number; defKind: string; level: number };
export type ProjectileSnap = {
  x: number; y: number; kind: string;
  /** AoE pulse: current expanded radius (tiles). 0 for other kinds. */
  currentRadius: number;
  /** Hitscan beam origin (tiles). 0 for non-hitscan projectiles. */
  fromX: number; fromY: number;
  /** Bomb (aoe-pulse) lifecycle phase. null for non-bomb projectiles. */
  bombPhase: 'flight' | 'detonate' | null;
  /** 0..1 progress through flight; only meaningful when bombPhase === 'flight'. */
  flightProgress: number;
};
export type BuildHintSnap = { col: number; row: number; valid: boolean } | null;
export type RangeSnap = { x: number; y: number; r: number } | null;

export type WorldSnapshot = {
  enemies: EnemySnap[];
  towers: TowerSnap[];
  projectiles: ProjectileSnap[];
};

export const EMPTY_SNAPSHOT: WorldSnapshot = {
  enemies: [], towers: [], projectiles: [],
};

// NOTE: Reanimated freezes objects assigned to a SharedValue (in __DEV__ at
// least), so we cannot reuse a buffer across frames. Allocate fresh each
// snapshot. The dominant perf win is decoupling range/buildHint into their
// own event-driven SharedValues (see useGameSession.ts) — the per-frame
// alloc cost here is small compared to the worklet churn that change avoids.
export function buildSnapshot(world: World): WorldSnapshot {
  const enemies: EnemySnap[] = [];
  for (const e of world.entities.enemies) {
    if (!e.alive) continue;
    enemies.push({ x: e.x, y: e.y, defKind: e.defKind, hp: e.hp, maxHp: e.maxHp });
  }
  const towers: TowerSnap[] = [];
  for (const t of world.entities.towers) {
    if (!t.alive) continue;
    towers.push({ x: t.x, y: t.y, defKind: t.defKind, level: t.level });
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
    }
    projectiles.push({ x: p.x, y: p.y, kind: p.kind, currentRadius: cr, fromX, fromY, bombPhase, flightProgress });
  }
  return { enemies, towers, projectiles };
}

export function rangeFromSelection(world: World): RangeSnap {
  const t = world.selection.tower;
  if (!t || !t.alive) return null;
  return { x: t.x, y: t.y, r: t.base.range };
}
