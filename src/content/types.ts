import { type Tower, type TargetPriority, type TowerTargets, type TowerInit } from '@/entities/Tower';
import { type Enemy, type EnemyInit } from '@/entities/Enemy';
import { type Projectile, type ProjectileInit } from '@/entities/Projectile';
import { type GridCoord, type DeepReadonly } from '@/lib/types';
import { type TileType } from '@/world/Grid';

export type TowerKind =
  | 'bullet-turret'
  | 'machine-gun'
  | 'firewall'
  | 'logic-bomb'
  | 'ice-lance'
  | 'sniper'
  | 'tesla-coil'
  | 'venom-spire'
  | 'emp'
  | 'plasma-cannon'
  | 'mortar'
  | 'cryo-field'
  | 'marker'
  | 'beam-cannon'
  | 'flamer';
export type EnemyKind =
  | 'worm'
  | 'trojan'
  | 'daemon'
  | 'rootkit'
  | 'wraith'
  | 'hypervisor'
  | 'kernelghost'
  | 'firmware-leech'
  | 'darknet-titan'
  | 'quantum-shade'
  | 'logic-gate'
  | 'voidwalker'
  | 'apex';
export type ProjectileKind =
  | 'bullet'
  | 'hitscan-bolt'
  | 'ballistic-pulse'
  | 'aoe-pulse'
  | 'tracer-round'
  | 'chain-arc'
  | 'poison-dart'
  | 'emp-burst'
  | 'marker-dart'
  | 'beam-arc'
  | 'flame-cone';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'insane';

export type TowerDef = DeepReadonly<{
  kind: TowerKind;
  displayName: string;
  baseStats: { range: number; fireRate: number; damage: number };
  /** Upgrade tiers (L1→L2 at index 0, L2→L3 at index 1). Cost is derived
   *  from `upgradeCost(cost, tier)` — not overridden per tower. */
  upgrades: ReadonlyArray<{ range: number; fireRate: number; damage: number }>;
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

export type BossSpecial =
  /** On death, spawn `count` enemies of `enemyKind` at the dying enemy's
   *  position. Inherit the parent's distAlongPath so spawns continue along
   *  the path from where the boss fell. */
  | { type: 'deathSpawn'; enemyKind: EnemyKind; count: number }
  /** Each second, heal every alive enemy within `radius` tiles by `hpPerSec`.
   *  Healing applies in fixed-timestep increments (not real-time). */
  | { type: 'healAura'; radius: number; hpPerSec: number };

export type EnemyDef = DeepReadonly<{
  kind: EnemyKind;
  displayName: string;
  baseStats: { hp: number; speed: number; armor: number };
  bounty: number;
  flying: boolean;
  classRef: new (init: EnemyInit) => Enemy;
  /** Optional boss-tier behavior the engine applies in addition to baseStats. */
  special?: BossSpecial;
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

export type ChapterDef = DeepReadonly<{
  index: number;
  name: string;
  subtitle: string;
  paletteAccent: string;
  paletteBackground?: string;
  artKey: string;
  briefing: string;
  bossEnemyKind?: EnemyKind;
  finaleLevelId?: string;
}>;

