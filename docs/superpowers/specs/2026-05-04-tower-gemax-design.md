# tower-gemax — Foundation Design

**Status:** Approved design (pre-implementation)
**Date:** 2026-05-04
**Scope:** Foundation / playable vertical slice
**Sister project:** [gemax.online](https://gemax.online) (cyberpunk isometric MMO — shared theme, separate codebase)

## 1. Vision

A cyberpunk-themed, single-player tower defense game built in React Native, running entirely on the client. The visual identity is "netrunner": the map is cyberspace, towers are defense programs, enemies are intrusions. The foundation ships as a playable vertical slice — one fully designed level, three towers, four enemies, ten waves, working difficulty selector, persistent save with meta-progression, and a tech tree with at least one in-game-observable effect. Later levels are stubs.

## 2. Locked decisions

| Axis | Choice |
|---|---|
| Visual perspective | Top-down 2D orthogonal (NOT isometric) |
| Path model | Fixed-path waves; level-designer-authored routes |
| Progression structure | Linear campaign |
| Difficulty model | Per-match selector (Easy / Normal / Hard / Insane) **and** ramping per-level/chapter |
| Foundation scope | Playable vertical slice (real level 1, stubs beyond) |
| Persistence model | Progress + meta-progression economy (shards + tech tree) |
| Theme | Network-defense / netrunner |
| Orientation | Portrait-only |
| Platforms | iOS + Android via Expo (managed workflow) |
| Audio | Stubbed wiring (placeholder sounds) |
| Engine architecture | Class-based entities, mutable refs, fixed-timestep accumulator on JS thread, Skia rendering |
| Rendering | `react-native-skia` (vector primitives + glow shaders), Reanimated 3 shared values for redraw signals |

## 3. Architecture

### 3.1 Runtime topology

```
App (NavigationContainer)
├── TitleScreen
├── LevelSelectScreen        → reads SaveStore
├── TechTreeScreen           → reads/writes SaveStore (spend shards)
├── PlayScreen               → hosts GameSession
│     └── GameSession        → owns engine for one match
│           ├── Engine       → fixed-timestep RAF loop
│           ├── World        → entities, path, level, wave director, event bus
│           ├── Renderer     → Skia <Canvas>, draws from World
│           ├── HUD          → React UI overlay (zustand-backed)
│           └── Input        → gestures → engine input queue
└── Pause / Win / Lose modals
```

### 3.2 Folder layout

```
src/
├── app/                navigation, screens, providers, bootstrap
│   ├── bootstrap.ts    catalog registration entrypoint
│   ├── screens/
│   └── providers/
├── engine/             RN-free, vitest-tested
│   ├── Engine.ts       fixed-timestep loop, AppState handling
│   ├── time.ts         clock, dt clamping, accumulator
│   ├── EventBus.ts     typed pub/sub for sim → HUD
│   ├── Viewport.ts     world↔screen↔grid conversions, canvas rect, DPR
│   ├── rng.ts          SeededRng (mulberry32 or sfc32)
│   ├── pool/           object-pool primitive
│   └── systems/        movement, targeting, damage, cleanup
├── world/
│   ├── World.ts        single mutable object owned by GameSession
│   ├── Path.ts         polyline, distAlongPath ↔ xy
│   ├── Grid.ts         tile types, build validity
│   ├── Spawner.ts
│   └── WaveDirector.ts
├── entities/
│   ├── Entity.ts       base class
│   ├── Tower.ts        base + subclasses (FirewallTower, LogicBombTower, ICELanceTower)
│   ├── Enemy.ts        base + subclasses (WormEnemy, TrojanEnemy, DaemonEnemy, RootkitEnemy)
│   └── Projectile.ts   base + Hitscan / Ballistic / AoEPulse subclasses
├── render/
│   ├── SkiaWorld.tsx   the <Canvas>, layer composition
│   ├── layers/         BackgroundLayer, PathLayer, GridOverlayLayer, TowersLayer, EnemiesLayer, ProjectilesLayer, FXLayer, RangeIndicatorLayer
│   ├── shaders/        scanline.sksl, chromatic.sksl, glow helpers
│   └── theme.ts        palette tokens
├── content/            pure data, typed
│   ├── towers.ts       TOWER_DEFS[] (definitions, not classes)
│   ├── enemies.ts      ENEMY_DEFS[]
│   ├── projectiles.ts  PROJECTILE_DEFS[]
│   ├── techTree.ts     TECH_NODES[]
│   └── levels/
│       ├── lvl-01-intranet.ts (real)
│       └── stubs.ts (placeholders for chapter completion math)
├── difficulty/
│   ├── selector.ts     selector multipliers
│   ├── ramp.ts         chapter ramp + soft cap
│   └── DifficultyContext.ts
├── meta/
│   ├── SaveStore.ts    AsyncStorage facade with debounced atomic writes
│   ├── migrations/
│   │   ├── index.ts    sequenced (vN → vN+1) functions
│   │   └── v0-to-v1.ts (placeholder; v1 is initial schema)
│   └── TechTree.ts     unlock evaluation, EffectsContext builder
├── audio/
│   ├── AudioManager.ts expo-audio, pooled SFX
│   └── catalog.ts      named SFX → asset mapping
├── ui/                 buttons, panels, modals, design tokens
├── theme/              palette, typography, spacing
└── lib/                vec2, lerp, assert, debounce, types
```

### 3.3 Boundary rules

- `engine/`, `world/`, `entities/`, `content/`, `difficulty/`, `meta/`, `lib/` import **no** RN, Skia, or Reanimated. They are pure TypeScript and run in vitest.
- `render/` reads `World` once per frame; never writes.
- `content/` is data only — no behavior. Tower definitions reference behavior classes by string `kind`.
- `meta/` is the only module touching `AsyncStorage`.
- `app/` orchestrates and bootstraps; contains no game logic.
- `world/` and `entities/` are mutable; `content/` is frozen.

## 4. Engine

### 4.1 Game loop

A single `requestAnimationFrame` callback drives the engine on the JS thread. The loop uses a **fixed-timestep accumulator** so simulation cost is constant regardless of speed setting and frame rate.

```ts
const FIXED_DT = 1 / 60;             // 16.67 ms
const MAX_STEPS_PER_FRAME = 5;       // anti-spiral cap
let accumulator = 0;

function frame(now: number) {
  const realDt = clamp((now - last) / 1000, 0, 0.033);
  last = now;

  accumulator += realDt * speedMultiplier;          // 1×, 2×, 3×
  let steps = 0;
  while (accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
    simStep(FIXED_DT);
    accumulator -= FIXED_DT;
    steps++;
  }
  if (steps === MAX_STEPS_PER_FRAME) accumulator = 0; // drop the rest

  bumpRedraw();
  raf = requestAnimationFrame(frame);
}
```

Pause stops scheduling new frames; resume re-arms `last = performance.now()` before scheduling the next frame.

The simulation runs at 60 Hz internally; the renderer redraws at display refresh. Speed control scales `dt`, never iteration count, so doubling speed does not double cost per frame.

### 4.2 System order per `simStep`

1. `Input.flush()` — drain the input queue into events
2. `WaveDirector.tick(dt)` — advance wave timer, emit wave events
3. `Spawner.tick(dt)` — spawn enemies queued for this tick
4. **Read phase:** `targeting`, `movement` — systems read entity arrays, write to staged event buffers (`damageEvents`, `spawnEvents`, `despawnEvents`)
5. **Write phase:** `damageSystem(damageEvents)`, `cleanupSystem(despawnEvents)` — apply staged events
6. `winLoseCheck()` — set `world.status` if terminal
7. `EventBus.flush()` — deliver buffered sim → HUD signals
8. `bumpRedrawTick()`

Read/write phase separation preserves determinism: a tower's update never depends on whether another tower's update has already mutated the shared enemy array within the same tick.

### 4.3 Pause, AppState, and clock hygiene

- Pause = stop calling `requestAnimationFrame` and freeze the audio loop.
- An `AppState` listener pauses the engine on `background` and resets `last = performance.now()` on `active` so the first frame after resume produces `dt ≈ 0` rather than a multi-second jump.
- Speed switch resets `accumulator = 0` to avoid replaying queued steps at the new speed.

### 4.4 Determinism

- All randomness routes through `world.rng` (a seeded `SeededRng` instance).
- `(levelId, difficulty, seed, inputTimeline) → (final world state)` is reproducible. This is asserted in vitest engine tests.
- Determinism is bounded by `FIXED_DT`; varying real frame rate does not affect the simulation.

## 5. World state

A single mutable object held in `useRef`. Never reassigned (`<Canvas>` mounts with `key={levelId}` so a level transition remounts the tree instead).

```ts
type World = {
  status: 'preparing' | 'playing' | 'paused' | 'won' | 'lost';
  time: number;                              // sim seconds since match start
  lives: number;
  credits: number;
  wave: { index: number; status: 'idle' | 'in-progress' | 'cleared'; startedAt: number; enemiesRemaining: number };
  level: LevelDef;                           // frozen for the match
  path: PathPolyline;                        // precomputed waypoints
  grid: BuildGrid;                           // tile state including tower occupants
  entities: { towers: Tower[]; enemies: Enemy[]; projectiles: Projectile[] };
  pools: { projectiles: ObjectPool<Projectile>; statuses: ObjectPool<StatusEffect> };
  staged: { damage: DamageEvent[]; spawn: SpawnEvent[]; despawn: DespawnEvent[] };
  rng: SeededRng;
  difficulty: DifficultyContext;             // resolved selector + ramp + tech effects
  selection: { towerId?: string; buildSpot?: GridCoord };
  events: EventBus;                          // sim → HUD
  redrawTick: SharedValue<number>;
};
```

**Mutation rules:**
- Entities mutate themselves in-place. Arrays mutate via `push` / `splice`, never reassignment.
- `world.entities.*` array references stable across the entire match.
- HUD reads world state via `EventBus` events and a small zustand store; HUD never reads entity arrays directly.

## 6. Entities

### 6.1 Base shape

```ts
abstract class Entity {
  id: string;
  kind: string;                  // 'tower:firewall', 'enemy:worm', etc.
  x: number; y: number;
  alive = true;
  abstract update(world: World, dt: number): void;
}
```

### 6.2 Tower

```ts
class Tower extends Entity {
  defKind: TowerKind;            // 'firewall' | 'logic-bomb' | 'ice-lance'
  level: 1 | 2 | 3;
  range: number;
  fireRate: number;              // shots/sec
  damage: number;
  projectileKind: ProjectileKind;
  cooldown: number;              // seconds remaining
  tileCoord: GridCoord;
  targetPriority: 'first' | 'last' | 'strongest' | 'weakest' | 'closest';
  targets: 'ground' | 'flying' | 'both';
  // update: pick target by priority, fire if cooldown ≤ 0
}
```

Subclasses override `fire()` for special behavior (Logic Bomb spawns an AoE pulse; ICE Lance applies a freeze status; Firewall fires a hitscan).

### 6.3 Enemy

```ts
class Enemy extends Entity {
  defKind: EnemyKind;            // 'worm' | 'trojan' | 'daemon' | 'rootkit'
  hp: number; maxHp: number;
  baseSpeed: number;             // tiles/sec
  armor: number;                 // flat reduction
  flying: boolean;
  bounty: number;
  pathIndex: number;
  distAlongPath: number;
  statuses: StatusEffect[];      // pooled
  lastDamagedBy?: string;        // tower id, for bounty attribution
  // update: advance along path; apply statuses; die on hp ≤ 0
}
```

### 6.4 Projectile

```ts
abstract class Projectile extends Entity {
  damage: number;
  sourceTowerId: string;
  ttl: number;
}

class Hitscan extends Projectile { ... }   // resolves on spawn (Firewall)
class Ballistic extends Projectile { ... } // travels with vx,vy toward target
class AoEPulse extends Projectile { ... }  // expanding radius, damages in cone (Logic Bomb)
```

Projectiles and statuses are **pooled from day one**. `world.pools.projectiles.acquire()` / `release()` instead of `new`. Pool size grows with `wave.enemiesRemaining * 2` heuristic at wave start.

### 6.5 Catalog and registration

`content/towers.ts`, `content/enemies.ts`, `content/projectiles.ts` export plain typed records:

```ts
export const FIREWALL: TowerDef = {
  kind: 'firewall',
  displayName: 'Firewall',
  baseStats: { range: 3.5, fireRate: 1.2, damage: 8 },
  upgrades: [/* level 2 stats */, /* level 3 stats */],
  cost: 50,
  projectileKind: 'hitscan-bolt',
  defaultTargetPriority: 'first',
  targets: 'both',
  classRef: FirewallTower,                 // direct class reference
  art: { ... },
  sfx: { fire: 'sfx/firewall-fire' },
};
```

Registration happens in `app/bootstrap.ts` via explicit calls:

```ts
registerTowers([FIREWALL, LOGIC_BOMB, ICE_LANCE]);
registerEnemies([WORM, TROJAN, DAEMON, ROOTKIT]);
registerProjectiles([HITSCAN_BOLT, BALLISTIC_PULSE, AOE_PULSE]);
```

No module-level side effects. Survives Fast Refresh, isolates cleanly in tests.

### 6.6 Stat resolution

All stat reads go through one accessor:

```ts
getStat(entity, statName, world) // applies difficulty + tech effects + statuses
```

This is the single seam for difficulty multipliers, tech-tree multipliers, and runtime statuses (e.g., a frozen enemy's effective speed).

### 6.7 Bounty attribution

`lastDamagedBy` is set every time damage is applied — by direct hit, AoE, or DoT tick. DoT ticks attribute to the tower that originally applied the status. On death, `bounty` goes to whoever holds `lastDamagedBy`. The field is non-null at death by construction.

## 7. Path and grid

- `Path` is an ordered list of grid waypoints. Precomputed at level load: `samples[i] = { x, y, distFromStart }` at fixed sub-tile spacing for fast `distAlongPath → xy` lookup.
- `Grid` is a 2D array of `TileType ∈ { 'path', 'buildable', 'blocked' }`. Towers occupy `buildable` tiles; placement validity is one cell (no multi-cell towers in v1).
- `Viewport` (engine module) owns three coordinate spaces: **grid** (integer cells), **world** (Skia px in canvas-local space), **screen** (gesture px including safe-area insets and DPR). Every conversion goes through `Viewport`.

## 8. Difficulty model

### 8.1 Selector

| | Easy | Normal | Hard | Insane |
|---|---|---|---|---|
| Enemy HP × | 0.80 | 1.00 | 1.35 | 1.75 |
| Enemy speed × | 1.00 | 1.00 | 1.10 | 1.10 |
| Start credits × | 1.15 | 1.00 | 0.90 | 0.85 |
| Shard reward × | 0.5 | 1.0 | 1.5 | 2.5 |

Wave count is **constant per level** across all difficulties. Wave content/density is the difficulty surface, not wave count. Easy is losable on inattention; Insane is the speed-cap-respecting endgame.

### 8.2 Chapter ramp

```
chapterHpMult    = min(1 + 0.07 * chapterIndex, 2.0)
chapterSpeedMult = min(1 + 0.04 * chapterIndex, 1.20)
```

Soft caps prevent divergence past chapter ~15. Combined max enemy speed across selector + ramp is ×1.32 (×1.10 × ×1.20), inside the DPS-window safe zone for the seeded fire rates.

### 8.3 New archetypes

Specific chapters introduce new enemy kinds (predetermined, not procedural). The chapter ramp is not the only difficulty axis — late chapters also bring kinds that demand new tools.

### 8.4 `DifficultyContext`

Resolved once at match start:

```ts
type DifficultyContext = {
  selector: 'easy' | 'normal' | 'hard' | 'insane';
  enemyHpMult: number;       // selector × ramp
  enemySpeedMult: number;
  startCreditsMult: number;
  shardRewardMult: number;
};
```

Stored on `world.difficulty`. Consumed by `getStat`.

## 9. Wave model

```ts
type LevelDef = {
  id: string;                    // 'lvl-01-intranet'
  name: string;
  chapter: number;
  unlockRequires?: string;
  grid: { cols: number; rows: number; cells: TileType[][] };
  spawners: { id: string; tile: GridCoord }[];   // ≥1 spawner; default 'main'
  path: GridCoord[];                              // ordered tiles
  startCredits: number;
  startLives: number;
  waves: WaveDef[];                               // count is constant across difficulties
  starThresholds: { stars3: number; stars2: number; stars1: number };  // remaining-lives gates
};

type WaveDef = {
  delayBeforeStart: number;       // seconds for pre-build
  groups: SpawnGroup[];
};

type SpawnGroup = {
  id: string;                     // unique within wave
  spawnerId: string;              // default 'main'
  enemyKind: EnemyKind;
  count: number;
  spacing: number;                // seconds between spawns
  delay: number;                  // seconds after wave start
  afterGroupId?: string;          // start only after this group finishes; supersedes `delay`
};
```

`spawnerId` enables future multi-spawner / multi-lane levels with no schema migration. `afterGroupId` enables sequential composition (e.g., "boss → adds") without delay-math hell.

## 10. Content seed

### 10.1 Towers

| Tower | Role | Base | Notes |
|---|---|---|---|
| **Firewall** | Cheap single-target | range 3.5, rate 1.2/s, dmg 8, cost 50 | Hitscan. Default priority: first. |
| **Logic Bomb** | AoE, slow rate of fire | range 2.5, rate 0.5/s, dmg 6 in r1.5, cost 90 | AoE pulse on impact. Default priority: strongest. |
| **ICE Lance** | High single-target, slow tower | range 4.5, rate 0.7/s, dmg 22, cost 140 | Applies brief `freeze` (1s) on hit. Default priority: strongest. |

All values are seeds for balancing, not final. Each tower has 3 levels; level 2/3 stat curves authored alongside.

### 10.2 Enemies (v1)

| Enemy | Role | Base |
|---|---|---|
| **Worm** | Fast, fragile | hp 18, speed 2.6, armor 0, bounty 4 |
| **Trojan** | Balanced | hp 50, speed 1.6, armor 1, bounty 9 |
| **Daemon** | Slow, armored | hp 130, speed 1.0, armor 4, bounty 18 |
| **Rootkit** | Boss | hp 800, speed 0.8, armor 6, bounty 80 |

All `flying: false` in v1. The `flying` field exists on day one so a flying archetype is a content-only addition later.

### 10.3 Statuses

```ts
type StatusEffect = {
  kind: 'slow' | 'stun' | 'dot' | 'freeze';
  remaining: number;       // seconds
  magnitude: number;       // slow ratio, dot dps, etc.
  appliedByTowerId: string;
};
```

`getStat(enemy, 'speed', world)` multiplies by `(1 - slow.magnitude)` and zeroes out for `freeze`/`stun`. DoT damage applies in `damageSystem` and updates `lastDamagedBy`.

## 11. Meta-progression

### 11.1 Tech tree (v1)

Nine nodes, all behavior-changing:

| Node | Cost | Effect |
|---|---|---|
| Firewall T1 | 30 | Chain to a 2nd target on kill |
| Firewall T2 | 80 | Chain to a 3rd target on kill (requires T1) |
| Logic Bomb T1 | 30 | Leaves a 2-second slow field after detonation |
| Logic Bomb T2 | 80 | Slow field lasts 4 seconds, applies dot (requires T1) |
| ICE Lance T1 | 40 | 25% crit chance for 2× damage |
| ICE Lance T2 | 90 | Crit chance 50% (requires T1) |
| Global: Reserves | 30 | +50 starting credits per match |
| Global: Salvage | 40 | Sell rebate 70% → 90% |
| Global: Self-heal | 60 | Regenerate 1 life per minute (capped at level start lives) |

Total cost to unlock all: 480 shards. Chapter 1 v1 economy delivers ~250–280 shards across all difficulties, unlocking ~5 nodes — enough to feel meaningful, not enough to feel done.

### 11.2 Effects model

```ts
type TechEffect =
  | { kind: 'tower-behavior'; tower: TowerKind; behavior: 'chain'; chainCount: number }
  | { kind: 'tower-behavior'; tower: 'logic-bomb'; behavior: 'slow-field'; duration: number; dot?: number }
  | { kind: 'tower-behavior'; tower: 'ice-lance'; behavior: 'crit'; chance: number; mult: number }
  | { kind: 'global'; effect: 'start-credits'; bonus: number }
  | { kind: 'global'; effect: 'sell-rebate'; ratio: number }
  | { kind: 'global'; effect: 'life-regen'; perMinute: number };
```

At match start, `TechTree.buildEffectsContext(save)` collects unlocked nodes into a single `EffectsContext` consumed by tower behavior code and `getStat`.

### 11.3 Stars and shard reward

Stars per level (per difficulty) determined by remaining lives at win:

```
stars = lives ≥ thresholds.stars3 ? 3
      : lives ≥ thresholds.stars2 ? 2
      : lives > 0                 ? 1
      : 0;

shardsAwarded = round(stars * 10 * difficulty.shardRewardMult * (1 + 0.05 * chapterIndex))
```

Best-stars-per-difficulty is the persisted record. Shards are awarded **once per (level, difficulty)** the first time that star tier is achieved.

### 11.4 Other game-economy rules

- **Sell rebate:** 70% baseline, 90% with `Global: Salvage` unlocked.
- **Send next wave early:** if the player taps "Send next wave" during the pre-wave countdown, they receive `floor(remainingDelay * 5)` bonus credits.
- **Wave preview:** the HUD shows the upcoming wave's enemy composition (kinds + counts) before it spawns.
- **Leak penalty:** 1 leak = 1 life regardless of enemy kind (uniform v1).
- **Retry:** in-match state is discarded; persistent meta is preserved.

## 12. Save system

### 12.1 Schema (v1)

Storage key: `tower-gemax/save/v1`. Persisted blob is `{ version: 1, data: SaveDataV1 }`.

```ts
type SaveDataV1 = {
  profile: { createdAt: number; lastPlayedAt: number };
  campaign: {
    [levelId: string]: {
      bestStarsByDifficulty: Partial<Record<Difficulty, 0|1|2|3>>;
      bestWaveReached: number;
      cleared: boolean;
      shardsAwardedFor: Difficulty[];     // prevents double-paying for replayed runs
    };
  };
  meta: {
    shards: number;
    techTree: { [nodeId: string]: number };  // 0 = locked, ≥1 = tier unlocked
  };
  settings: {
    audioMaster: number;
    sfx: number;
    music: number;
    difficultyDefault: Difficulty;
    tutorialSeen: boolean;
  };
};
```

### 12.2 Migration

Migrations are a sequence of pure functions:

```ts
type Migration<From, To> = { from: number; to: number; migrate: (data: From) => To };
const MIGRATIONS: Migration<any, any>[] = [
  // { from: 1, to: 2, migrate: (d: SaveDataV1): SaveDataV2 => ({ ... }) },
];

function load(): SaveDataLatest {
  const blob = JSON.parse(await AsyncStorage.getItem(KEY) ?? '...');
  let { version, data } = blob;
  for (const m of MIGRATIONS) {
    if (version === m.from) { data = m.migrate(data); version = m.to; }
  }
  return data;
}
```

Each migration ships with a snapshot test (`migrations/v1-to-v2.test.ts`) asserting `migrate(v1Fixture) deepEqual v2Fixture`. Migrations never branch and never skip versions.

### 12.3 Atomic writes

AsyncStorage is not transactional. To avoid corruption on crash mid-write:

1. Serialize once.
2. `AsyncStorage.setItem('tower-gemax/save/v1.tmp', serialized)`.
3. `AsyncStorage.setItem('tower-gemax/save/v1', serialized)`.
4. `AsyncStorage.removeItem('tower-gemax/save/v1.tmp')`.

On load, if `v1` is corrupt or missing but `v1.tmp` is valid, recover from `v1.tmp`. (AsyncStorage lacks atomic rename, so this is "two-key swap" rather than true rename.)

Writes are debounced 250 ms.

## 13. Audio

`expo-audio` (the new Expo audio API; `expo-av` retired for SFX use).

```ts
class AudioManager {
  init(): Promise<void>;          // setAudioModeAsync, preload all SFX & music
  playSfx(key: SfxKey): void;     // round-robin pooled instance
  playMusic(key: MusicKey, opts?: { fadeIn?: number }): Promise<void>;
  stopMusic(opts?: { fadeOut?: number }): Promise<void>;
  setVolumes({ master, sfx, music }: Volumes): void;
}
```

- iOS: `Audio.setAudioModeAsync({ playsInSilentModeIOS: true, ... })` at boot so SFX play with the silent switch on.
- SFX pool: each SFX loads `N` `Sound` instances at boot (e.g., 4 for `tower-fire-firewall` to allow overlap). Round-robin acquisition; no per-shot `createAsync`.
- Music: single `Sound` instance per track, crossfade by adjusting volume.
- v1 ships placeholder audio (royalty-free or generated tones). Wiring is the deliverable; replacement is content.

## 14. Rendering

### 14.1 Composition

```tsx
<GestureDetector gesture={Gesture.Race(tap, longPress, pan)}>
  <Canvas style={canvasStyle} onLayout={onCanvasLayout}>
    <BackgroundLayer />
    <PathLayer />
    <GridOverlayLayer />
    <TowersLayer />
    <EnemiesLayer />
    <ProjectilesLayer />
    <FXLayer />
    <RangeIndicatorLayer />   {/* on tower selection / placement */}
  </Canvas>
</GestureDetector>
<HUD />                          {/* React, zustand-backed, sibling of Canvas */}
```

### 14.2 Redraw signal

Each layer subscribes to `world.redrawTick` via Skia/Reanimated:

```tsx
function TowersLayer() {
  const path = useDerivedValue(() => {
    redrawTick.value;                    // dependency
    return drawTowers(worldRef.current);
  });
  return <Path path={path} />;
}
```

**Invariants:**
- `worldRef.current` is never reassigned during a level. On level transition, `<Canvas>` remounts via `key={levelId}`.
- Entity arrays are mutated in place (`push` / `splice`), never replaced.
- Layers do not close over array literals; they close over `worldRef`.

### 14.3 Visual identity

- **Palette:** `#0A0E1A` backdrop, neon cyan `#00F0FF`, magenta `#FF2BD6`, acid green `#7CFF6B`, HUD amber `#FFB347`.
- **Typography:** monospace (JetBrains Mono via `expo-font`) for HUD numerics; thin geometric sans for menus.
- **Path:** glowing wireframe corridor with animated dashed centerline ("data flow").
- **Towers / Enemies (v1 art):** Skia primitives (rect / path / circle) with neon strokes and `<Blur />` bloom.
- **Effects:** scanline overlay (Skia shader), chromatic-aberration on damage taken, glitch flash on life-loss.

### 14.4 Gestures

Single `<GestureDetector>` wrapping the canvas with `Gesture.Race(tap, longPress, pan)`. Hit-testing happens in `runOnJS` callbacks against `Viewport.screenToWorld`. The canvas rect is captured once via `onLayout`; gestures use that rect, not `pageX/pageY` minus a guessed header height.

No moving camera in v1 (full level fits on screen) — `Viewport` exposes a static identity transform plus DPR scaling.

## 15. UI screens

| Screen | Purpose | Notes |
|---|---|---|
| TitleScreen | Continue / New Game / Tech Tree / Settings | Skia-rendered animated background |
| LevelSelectScreen | Vertical scroll of chapters → levels | Per-difficulty stars, locked/unlocked, difficulty selector pills |
| TechTreeScreen | Skia-rendered node graph | Tap to inspect; unlock if affordable + prereqs met; shard balance shown |
| PlayScreen | The match | Hosts `<GameSession>`, HUD, bottom tower bar |
| PauseModal | Resume / Restart / Exit | Overlay |
| WinModal | Stars earned + shards earned + Continue | |
| LoseModal | Retry / Exit | |
| SettingsModal | Volumes / default difficulty / reset save | |

HUD elements (lives, credits, wave indicator) read from a small zustand store the engine writes to via `EventBus → HUD bridge`. The `<PlayScreen>` component holding `<Canvas>` does not store these — keeps the canvas parent stable across HUD ticks.

## 16. Testing

### 16.1 Engine tests (vitest)

`src/engine`, `src/world`, `src/entities`, `src/content`, `src/difficulty`, `src/meta`, `src/lib` are RN-free TypeScript. They run in vitest with their own `tsconfig.engine.json`. Target: full engine suite under 2 seconds.

Coverage:
- **Determinism:** given `(level, difficulty, seed, scripted inputs)`, assert end state across 100 randomized seeds.
- **Path math:** `distAlongPath ↔ xy` round-trip; sub-tile interpolation.
- **Grid placement:** valid / invalid / occupied.
- **Difficulty modifiers:** selector × ramp + soft caps at chapter 15, 30, 50.
- **Wave director:** `afterGroupId` ordering, parallel groups, `spawnerId` routing.
- **Save migration:** snapshot tests per migration; corrupted-blob recovery from `.tmp`.
- **Tech effects:** unlocked node set → `EffectsContext` shape; effect-on-tower behavior assertions.
- **Bounty attribution:** DoT credit goes to the tower that applied the status.

### 16.2 RN side

Jest with `jest-expo` preset for RN-specific bits: render smoke tests for screens, `AsyncStorage` integration via mock. **No** snapshot UI tests in v1 (rot fast, low value).

### 16.3 Device QA

Expo Go on iPhone (mid-tier, e.g., iPhone 12) and a mid-tier Android (e.g., Pixel 6). Profile with React DevTools and `react-native-skia`'s draw-call counter during a heavy wave (≥40 entities + projectiles).

## 17. Toolchain

- **Expo SDK:** latest stable (managed). Pinned to exact version.
- **React Native:** matches Expo SDK pin.
- **TypeScript:** latest stable.
- **`react-native-skia`:** pinned exact (the Reanimated integration is version-coupled).
- **`react-native-reanimated`:** pinned exact.
- **`react-native-gesture-handler`:** pinned exact.
- **`@react-native-async-storage/async-storage`:** pinned exact.
- **`expo-audio`:** pinned exact.
- **`zustand`:** UI store only; pinned exact.
- **State of dev environment** documented in `README.md` with the locked triple of (Expo SDK, Skia, Reanimated).

## 18. Vertical-slice acceptance

The foundation is "done" when:

1. App boots cleanly on iOS + Android via Expo Go.
2. Title → Level Select → Play → Win/Lose → back to Level Select navigates without crashes or memory leaks.
3. Level 1 (chapter 1) is fully playable with all three towers, four enemies, and ten waves.
4. Difficulty selector affects every match; star ratings and shards persist across app restarts.
5. Tech tree screen lets the player spend shards on at least one node; the unlocked node has a visually observable effect during the next match (e.g., chain target on Firewall).
6. Pause / resume / 1× / 2× / 3× / retry / exit-to-menu all work.
7. Audio: at least one SFX per category and one music track loop, played through the audio manager.
8. Sustained 60 fps on a Pixel 6 during the heaviest wave (≥40 entities + projectiles).
9. Engine tests passing locally (`vitest run`).
10. Deterministic match runs reproduce across 100 randomized seeds.

## 19. Open questions (resolved during planning, not blockers)

- Final hand-designed level 1 map and wave script (will draft and iterate during implementation).
- Final tower / enemy stat numbers (seed values are placeholder; balance is an explicit later pass).
- Tutorial overlay scope for v1 (lean: scripted callouts on first run; confirm during planning).
- Asset sourcing for v1 (default: Skia primitive art; raster sprite path remains open behind the same `draw(entity)` interface).
- Whether to lock the first run to Normal difficulty or allow Easy / Hard / Insane immediately (lean: Easy / Normal selectable from the start; Hard / Insane unlock after first level clear at Normal).

## 20. Out of scope

- Multiplayer, leaderboards, cloud save, or any networked feature.
- Procedural level generation.
- Endless mode.
- Freeform maze-build levels.
- Isometric rendering.
- In-app purchases / monetization plumbing.
- Achievements / quests system.
- Localization (English-only v1).
- Cross-device save sync.
