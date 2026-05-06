import type { LevelDef, Difficulty } from '@/content/types';
import type { Tower } from '@/entities/Tower';
import type { Enemy } from '@/entities/Enemy';
import type { Projectile } from '@/entities/Projectile';
import { BuildGrid } from '@/world/Grid';
import { Path } from '@/world/Path';
import { Spawner } from '@/world/Spawner';
import { WaveDirector } from '@/world/WaveDirector';
import { ObjectPool } from '@/engine/pool/ObjectPool';
import { EventBus, type SimEventMap } from '@/engine/EventBus';
import { SeededRng } from '@/engine/rng';
import { type DifficultyContext, createDifficultyContext } from '@/difficulty/DifficultyContext';
import { makeIdGen, type IdGen } from '@/lib/id';
import { HitscanProjectile } from '@/entities/projectiles/HitscanProjectile';
import { BallisticProjectile } from '@/entities/projectiles/BallisticProjectile';
import { AoEPulseProjectile } from '@/entities/projectiles/AoEPulseProjectile';
import { TracerRoundProjectile } from '@/entities/projectiles/TracerRoundProjectile';
import { ChainArcProjectile } from '@/entities/projectiles/ChainArcProjectile';
import { PoisonDartProjectile } from '@/entities/projectiles/PoisonDartProjectile';
import { EMPBurstProjectile } from '@/entities/projectiles/EMPBurstProjectile';
import { MarkerDartProjectile } from '@/entities/projectiles/MarkerDartProjectile';
import { BeamArcProjectile } from '@/entities/projectiles/BeamArcProjectile';
import { FlameConeProjectile } from '@/entities/projectiles/FlameConeProjectile';
import { BulletProjectile } from '@/entities/projectiles/BulletProjectile';
import type { GridCoord } from '@/lib/types';
import type { TileType } from '@/world/Grid';
import type { DamageEvent } from '@/engine/systems/damageSystem';
import type { LeakEvent } from '@/engine/systems/movementSystem';
import type { FireIntent } from '@/engine/systems/targetingSystem';

export type RedrawPort = { bump(): void };

export type EffectsContext = {
  /** tower-stat multipliers (defKind → stat → mult). */
  towerStatMults: Partial<Record<string, Partial<Record<string, number>>>>;
  /** behavior unlocks (consulted by tower fire logic). */
  behaviors: {
    chainKill?: Partial<Record<string, number>>;     // tower defKind → chainCount
    slowFieldOnLogicBomb?: { duration: number; dotPerSecond?: number };
    iceLanceCrit?: { chance: number; mult: number };
  };
  /** Globals applied at match start. */
  globals: {
    startCreditsBonus: number;
    /** Extra starting lives layered on top of `level.startLives`. */
    startLivesBonus: number;
    sellRebateRatio: number;       // default 0.7
    lifeRegenPerMinute: number;
    /** Multiplier on per-enemy bounty payouts (1 = no change). */
    bountyMult: number;
    /** Multiplier on EMP stun duration (and any future stun-applying tower). */
    stunDurationMult: number;
    /** Multiplier on end-of-match shard reward. Stacks with selector mult. */
    shardRewardMult: number;
  };
};

export const NULL_EFFECTS: EffectsContext = {
  towerStatMults: {},
  behaviors: {},
  globals: {
    startCreditsBonus: 0,
    startLivesBonus: 0,
    sellRebateRatio: 0.7,
    lifeRegenPerMinute: 0,
    bountyMult: 1,
    stunDurationMult: 1,
    shardRewardMult: 1,
  },
};

export type WorldStatus = 'preparing' | 'playing' | 'paused' | 'won' | 'lost';

export type World = {
  status: WorldStatus;
  time: number;
  lives: number;
  credits: number;
  selectedSpeed: 1 | 2 | 3;
  level: LevelDef;
  difficulty: DifficultyContext;
  effects: EffectsContext;
  paths: Path[];
  grid: BuildGrid;
  rng: SeededRng;
  idGen: IdGen;
  spawner: Spawner;
  waveDirector: WaveDirector;
  bus: EventBus<SimEventMap>;
  redraw: RedrawPort;
  entities: {
    towers: Tower[];
    enemies: Enemy[];
    projectiles: Projectile[];
  };
  pools: {
    hitscan: ObjectPool<HitscanProjectile>;
    ballistic: ObjectPool<BallisticProjectile>;
    aoe: ObjectPool<AoEPulseProjectile>;
    tracer: ObjectPool<TracerRoundProjectile>;
    chainArc: ObjectPool<ChainArcProjectile>;
    poisonDart: ObjectPool<PoisonDartProjectile>;
    empBurst: ObjectPool<EMPBurstProjectile>;
    markerDart: ObjectPool<MarkerDartProjectile>;
    beamArc: ObjectPool<BeamArcProjectile>;
    flameCone: ObjectPool<FlameConeProjectile>;
    bullet: ObjectPool<BulletProjectile>;
  };
  staged: {
    damage: DamageEvent[];
    leaks: LeakEvent[];
    fireIntents: FireIntent[];
  };
  selection: { towerId?: string; tower?: Tower; buildSpot?: GridCoord };
  matchSeed: number;
  /** Time since last life-regen tick, seconds (for the global tech node). */
  regenAccumulator: number;
};

export function createWorld(opts: {
  level: LevelDef;
  difficulty: Difficulty;
  effects?: EffectsContext;
  seed: number;
  redraw: RedrawPort;
  /** Optional ID generator (test injection). */
  idGen?: IdGen;
}): World {
  const effects = opts.effects ?? NULL_EFFECTS;
  const ctx = createDifficultyContext({
    selector: opts.difficulty,
    chapterIndex: opts.level.chapter,
  });

  const cells = opts.level.grid.cells.map((row) => row.slice() as TileType[]);
  // Reserve the path-endpoint row(s): no tower placement on the same row as
  // any base. Anything that isn't part of the path on those rows becomes blocked.
  const endpointRows = new Set<number>();
  for (const p of opts.level.paths) {
    const endpoint = p[p.length - 1];
    if (endpoint) endpointRows.add(endpoint.row);
  }
  for (const r of endpointRows) {
    const endRow = cells[r];
    if (endRow) {
      for (let c = 0; c < endRow.length; c++) {
        if (endRow[c] !== 'path') endRow[c] = 'blocked';
      }
    }
  }
  const grid = new BuildGrid({
    cols: opts.level.grid.cols,
    rows: opts.level.grid.rows,
    cells,
  });
  const tileSize = 1; // engine uses tile units; renderer scales to pixels
  const paths = opts.level.paths.map((wp) => new Path(wp, tileSize));
  const idGen = opts.idGen ?? makeIdGen();
  const bus = new EventBus<SimEventMap>();
  const spawner = new Spawner(idGen);

  const credits = Math.round(
    opts.level.startCredits * ctx.startCreditsMult + effects.globals.startCreditsBonus,
  );

  const world: World = {
    status: 'preparing',
    time: 0,
    lives: opts.level.startLives + effects.globals.startLivesBonus,
    credits,
    selectedSpeed: 1,
    level: opts.level,
    difficulty: ctx,
    effects,
    paths,
    grid,
    rng: new SeededRng(opts.seed),
    idGen,
    spawner,
    waveDirector: new WaveDirector(opts.level, spawner, bus),
    bus,
    redraw: opts.redraw,
    entities: { towers: [], enemies: [], projectiles: [] },
    pools: {
      hitscan: new ObjectPool<HitscanProjectile>({
        create: () => new HitscanProjectile({ id: idGen('proj'), kind: 'projectile:hitscan-bolt', x: 0, y: 0, damage: 0, sourceTowerId: '', ttl: 0 }),
        reset: (p) => p.resetForPool(),
        initialSize: 16,
      }),
      ballistic: new ObjectPool<BallisticProjectile>({
        create: () => new BallisticProjectile({ id: idGen('proj'), kind: 'projectile:ballistic-pulse', x: 0, y: 0, damage: 0, sourceTowerId: '', ttl: 0 }),
        reset: (p) => p.resetForPool(),
        initialSize: 16,
      }),
      aoe: new ObjectPool<AoEPulseProjectile>({
        create: () => new AoEPulseProjectile({ id: idGen('proj'), kind: 'projectile:aoe-pulse', x: 0, y: 0, damage: 0, sourceTowerId: '', ttl: 0 }),
        reset: (p) => p.resetForPool(),
        initialSize: 8,
      }),
      tracer: new ObjectPool<TracerRoundProjectile>({
        create: () => new TracerRoundProjectile({ id: idGen('proj'), kind: 'projectile:tracer-round', x: 0, y: 0, damage: 0, sourceTowerId: '', ttl: 0 }),
        reset: (p) => p.resetForPool(),
        initialSize: 8,
      }),
      chainArc: new ObjectPool<ChainArcProjectile>({
        create: () => new ChainArcProjectile({ id: idGen('proj'), kind: 'projectile:chain-arc', x: 0, y: 0, damage: 0, sourceTowerId: '', ttl: 0 }),
        reset: (p) => p.resetForPool(),
        initialSize: 8,
      }),
      poisonDart: new ObjectPool<PoisonDartProjectile>({
        create: () => new PoisonDartProjectile({ id: idGen('proj'), kind: 'projectile:poison-dart', x: 0, y: 0, damage: 0, sourceTowerId: '', ttl: 0 }),
        reset: (p) => p.resetForPool(),
        initialSize: 16,
      }),
      empBurst: new ObjectPool<EMPBurstProjectile>({
        create: () => new EMPBurstProjectile({ id: idGen('proj'), kind: 'projectile:emp-burst', x: 0, y: 0, damage: 0, sourceTowerId: '', ttl: 0 }),
        reset: (p) => p.resetForPool(),
        initialSize: 4,
      }),
      markerDart: new ObjectPool<MarkerDartProjectile>({
        create: () => new MarkerDartProjectile({ id: idGen('proj'), kind: 'projectile:marker-dart', x: 0, y: 0, damage: 0, sourceTowerId: '', ttl: 0 }),
        reset: (p) => p.resetForPool(),
        initialSize: 8,
      }),
      beamArc: new ObjectPool<BeamArcProjectile>({
        create: () => new BeamArcProjectile({ id: idGen('proj'), kind: 'projectile:beam-arc', x: 0, y: 0, damage: 0, sourceTowerId: '', ttl: 0 }),
        reset: (p) => p.resetForPool(),
        initialSize: 8,
      }),
      flameCone: new ObjectPool<FlameConeProjectile>({
        create: () => new FlameConeProjectile({ id: idGen('proj'), kind: 'projectile:flame-cone', x: 0, y: 0, damage: 0, sourceTowerId: '', ttl: 0 }),
        reset: (p) => p.resetForPool(),
        initialSize: 8,
      }),
      bullet: new ObjectPool<BulletProjectile>({
        create: () => new BulletProjectile({ id: idGen('proj'), kind: 'projectile:bullet', x: 0, y: 0, damage: 0, sourceTowerId: '', ttl: 0 }),
        reset: (p) => p.resetForPool(),
        initialSize: 32,
      }),
    },
    staged: { damage: [], leaks: [], fireIntents: [] },
    selection: {},
    matchSeed: opts.seed,
    regenAccumulator: 0,
  };

  return world;
}
