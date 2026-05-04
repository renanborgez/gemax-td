import type { TowerDef, EnemyDef, ProjectileDef, TowerKind, EnemyKind, ProjectileKind } from '@/content/types';
import { invariant } from '@/lib/assert';

const towers = new Map<TowerKind, TowerDef>();
const enemies = new Map<EnemyKind, EnemyDef>();
const projectiles = new Map<ProjectileKind, ProjectileDef>();

export function registerTowers(defs: readonly TowerDef[]): void {
  towers.clear();
  for (const def of defs) towers.set(def.kind, def);
}

export function registerEnemies(defs: readonly EnemyDef[]): void {
  enemies.clear();
  for (const def of defs) enemies.set(def.kind, def);
}

export function registerProjectiles(defs: readonly ProjectileDef[]): void {
  projectiles.clear();
  for (const def of defs) projectiles.set(def.kind, def);
}

export function getTowerDef(kind: TowerKind): TowerDef {
  const d = towers.get(kind);
  invariant(d, `tower not registered: ${kind}`);
  return d;
}

export function getEnemyDef(kind: EnemyKind): EnemyDef {
  const d = enemies.get(kind);
  invariant(d, `enemy not registered: ${kind}`);
  return d;
}

export function getProjectileDef(kind: ProjectileKind): ProjectileDef {
  const d = projectiles.get(kind);
  invariant(d, `projectile not registered: ${kind}`);
  return d;
}

export function listTowerKinds(): readonly TowerKind[] {
  return Array.from(towers.keys());
}

/** Test helper: clear all registries. */
export function _resetRegistry(): void {
  towers.clear();
  enemies.clear();
  projectiles.clear();
}
