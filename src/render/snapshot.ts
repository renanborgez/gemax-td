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
};
export type BuildHintSnap = { col: number; row: number; valid: boolean } | null;
export type RangeSnap = { x: number; y: number; r: number } | null;
export type BuildableSnap = { col: number; row: number };

export type WorldSnapshot = {
  enemies: EnemySnap[];
  towers: TowerSnap[];
  projectiles: ProjectileSnap[];
  buildHint: BuildHintSnap;
  range: RangeSnap;
  buildable: BuildableSnap[];
};

export const EMPTY_SNAPSHOT: WorldSnapshot = {
  enemies: [], towers: [], projectiles: [], buildHint: null, range: null, buildable: [],
};

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
    const cr = p.kind === 'projectile:aoe-pulse' ? (p as AoEPulseProjectile).currentRadius : 0;
    let fromX = 0, fromY = 0;
    if (p.kind === 'projectile:hitscan-bolt') {
      const hp = p as HitscanProjectile;
      fromX = hp.fromX; fromY = hp.fromY;
    }
    projectiles.push({ x: p.x, y: p.y, kind: p.kind, currentRadius: cr, fromX, fromY });
  }
  let buildHint: BuildHintSnap = null;
  const sel = world.selection.buildSpot;
  if (sel) buildHint = { col: sel.col, row: sel.row, valid: world.grid.canBuild(sel) };
  let range: RangeSnap = null;
  const tid = world.selection.towerId;
  if (tid) {
    const t = world.entities.towers.find((x) => x.id === tid);
    if (t) range = { x: t.x, y: t.y, r: t.base.range };
  }
  const buildable: BuildableSnap[] = [];
  const grid = world.grid;
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (grid.canBuild({ col: c, row: r })) buildable.push({ col: c, row: r });
    }
  }
  return { enemies, towers, projectiles, buildHint, range, buildable };
}
