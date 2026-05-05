import { type Tower, type TargetPriority, type TowerTargets, type TowerInit } from '@/entities/Tower';
import { type Enemy, type EnemyInit } from '@/entities/Enemy';
import { type Projectile, type ProjectileInit } from '@/entities/Projectile';
import { type GridCoord, type DeepReadonly } from '@/lib/types';
import { type TileType } from '@/world/Grid';

export type TowerKind =
  | 'firewall'
  | 'logic-bomb'
  | 'ice-lance'
  | 'sniper'
  | 'tesla-coil'
  | 'venom-spire';
export type EnemyKind = 'worm' | 'trojan' | 'daemon' | 'rootkit';
export type ProjectileKind =
  | 'hitscan-bolt'
  | 'ballistic-pulse'
  | 'aoe-pulse'
  | 'tracer-round'
  | 'chain-arc'
  | 'poison-dart';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'insane';

export type TowerDef = DeepReadonly<{
  kind: TowerKind;
  displayName: string;
  baseStats: { range: number; fireRate: number; damage: number };
  upgrades: ReadonlyArray<{ range: number; fireRate: number; damage: number; cost: number }>;
  cost: number;
  projectileKind: ProjectileKind;
  defaultTargetPriority: TargetPriority;
  targets: TowerTargets;
  classRef: new (init: TowerInit) => Tower;
  /** One-line pitch shown in the Towers screen. */
  description?: string;
  /** Shards required to permanently unlock this tower. Omitted = free starter. */
  unlockCost?: number;
}>;

export type EnemyDef = DeepReadonly<{
  kind: EnemyKind;
  displayName: string;
  baseStats: { hp: number; speed: number; armor: number };
  bounty: number;
  flying: boolean;
  classRef: new (init: EnemyInit) => Enemy;
}>;

export type ProjectileDef = DeepReadonly<{
  kind: ProjectileKind;
  speed?: number;
  ttl: number;
  classRef: new (init: ProjectileInit) => Projectile;
}>;

export type SpawnGroup = DeepReadonly<{
  id: string;
  spawnerId: string;
  enemyKind: EnemyKind;
  count: number;
  spacing: number;
  delay: number;
  afterGroupId?: string;
}>;

export type WaveDef = DeepReadonly<{
  delayBeforeStart: number;
  groups: ReadonlyArray<SpawnGroup>;
}>;

export type SpawnerSpec = DeepReadonly<{ id: string; tile: GridCoord }>;

export type LevelDef = DeepReadonly<{
  id: string;
  name: string;
  chapter: number;
  unlockRequires?: string;
  grid: { cols: number; rows: number; cells: ReadonlyArray<ReadonlyArray<TileType>> };
  spawners: ReadonlyArray<SpawnerSpec>;
  path: ReadonlyArray<GridCoord>;
  startCredits: number;
  startLives: number;
  waves: ReadonlyArray<WaveDef>;
  starThresholds: { stars3: number; stars2: number; stars1: number };
}>;

