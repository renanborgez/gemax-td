/**
 * Deterministic level generator. Produces every campaign mission from a
 * (chapter, mission) seed so the entire 100-level campaign is regenerated
 * verbatim across builds. Hand-authored level files are deprecated in favor
 * of this generator; designers tune the algorithm + per-chapter knobs in
 * one place instead of editing 100 files.
 *
 *  Design constraints:
 *    - Pure TS, RN-free. Tested via vitest.
 *    - Deterministic: same `(chapterIdx, missionIdx)` always yields the same
 *      `LevelDef`. No `Math.random` / `Date.now`.
 *    - Output validates against the chapters lint test (final wave of the
 *      finale level spawns the chapter boss) and the wave-survivability
 *      validator (only finale boss waves leak by Goal-Defense math).
 *    - Difficulty scales by `missionIdx` (within-chapter pacing) and
 *      `chapterIdx` (campaign pacing); per-match difficulty multipliers
 *      (Easy/Normal/Hard/Insane × chapter ramp) layer on top at runtime via
 *      `createDifficultyContext`.
 */

import type { LevelDef, EnemyKind, WaveDef, SpawnGroup } from '@/content/types';
import type { GridCoord, DeepReadonly } from '@/lib/types';
import type { TileType } from '@/world/Grid';
import { SeededRng } from '@/engine/rng';
import { CHAPTERS } from '@/content/chapters';

const MISSIONS_PER_CHAPTER = 10;

export const TOTAL_MISSIONS = MISSIONS_PER_CHAPTER * CHAPTERS.length;

// ─── Path templates ──────────────────────────────────────────────────────────

// Design rule: every template MUST have at least one bend. A spawn-to-base
// straight column gives towers in adjacent columns a free kill on every tile,
// trivializing tower placement — every map should force at least one corner.

type Template = {
  cols: number;
  rows: number;
  /** Waypoint sequence; consecutive points must be axis-aligned. Length ≥ 3
   *  so the path always has at least one bend. */
  waypoints: GridCoord[];
};

/** Hook: tight S-curve for the very first missions. Three bends keep enemies
 *  in tower range longer and give the player time to learn the loop. */
function tplHook(rng: () => number): Template {
  const cols = 5 + Math.floor(rng() * 2);    // 5–6
  const rows = 10 + Math.floor(rng() * 2);   // 10–11
  const midRow = Math.floor(rows * 0.45);
  return {
    cols, rows,
    waypoints: [
      { col: 0, row: 0 },
      { col: cols - 2, row: 0 },
      { col: cols - 2, row: midRow },
      { col: 1, row: midRow },
      { col: 1, row: rows - 1 },
    ],
  };
}

/** L-shape: two bends — drop part-way, then sweep across before final drop. */
function tplL(rng: () => number): Template {
  const cols = 6 + Math.floor(rng() * 2);    // 6–7
  const rows = 10 + Math.floor(rng() * 2);   // 10–11
  const midRow = 2 + Math.floor(rng() * 2);
  return {
    cols, rows,
    waypoints: [
      { col: 0, row: 0 },
      { col: 0, row: midRow },
      { col: cols - 2, row: midRow },
      { col: cols - 2, row: rows - 1 },
    ],
  };
}

/** U-shape: two bends. */
function tplU(rng: () => number): Template {
  const cols = 6 + Math.floor(rng() * 2);
  const rows = 11 + Math.floor(rng() * 2);
  return {
    cols, rows,
    waypoints: [
      { col: 0, row: 0 },
      { col: 0, row: Math.floor(rows / 2) },
      { col: cols - 2, row: Math.floor(rows / 2) },
      { col: cols - 2, row: rows - 1 },
    ],
  };
}

/** Z-shape: three sweeps. */
function tplZ(rng: () => number): Template {
  const cols = 7 + Math.floor(rng() * 2);
  const rows = 12 + Math.floor(rng() * 2);
  const midA = Math.floor(rows / 3);
  const midB = midA * 2;
  return {
    cols, rows,
    waypoints: [
      { col: 0, row: 0 },
      { col: cols - 2, row: 0 },
      { col: cols - 2, row: midA },
      { col: 1, row: midA },
      { col: 1, row: midB },
      { col: cols - 2, row: midB },
      { col: cols - 2, row: rows - 1 },
    ],
  };
}

/** Serpentine: 4–5 sweeps. */
function tplSerpentine(rng: () => number): Template {
  const cols = 7 + Math.floor(rng() * 3);
  const rows = 14 + Math.floor(rng() * 3);
  const sweeps = 4 + Math.floor(rng() * 2);
  const stride = Math.max(2, Math.floor((rows - 1) / sweeps));
  const waypoints: GridCoord[] = [{ col: 0, row: 0 }];
  let col = 0;
  for (let i = 0; i < sweeps; i++) {
    const targetRow = Math.min(rows - 1, (i + 1) * stride);
    const farCol = col === 0 ? cols - 2 : 1;
    waypoints.push({ col, row: targetRow });
    waypoints.push({ col: farCol, row: targetRow });
    col = farCol;
  }
  // Drop to base on the last column.
  waypoints.push({ col, row: rows - 1 });
  return { cols, rows, waypoints };
}

const TEMPLATES = [tplHook, tplL, tplU, tplZ, tplSerpentine];

/** Pick a template by mission complexity (0–9). Early missions favor short
 *  paths; later missions favor longer ones. Deterministic per (chapter, mission). */
function pickTemplate(chapterIdx: number, missionIdx: number, rng: () => number): Template {
  // Bucket missions into difficulty bands; bias template selection upward
  // through the chapter and slightly more aggressively in later chapters.
  const complexity = missionIdx + Math.floor(chapterIdx / 3);
  const idx = Math.min(TEMPLATES.length - 1, Math.floor(complexity / 2));
  return TEMPLATES[idx]!(rng);
}

// ─── Grid construction ──────────────────────────────────────────────────────

function expandPathCells(waypoints: ReadonlyArray<GridCoord>): GridCoord[] {
  if (waypoints.length === 0) return [];
  const cells: GridCoord[] = [{ col: waypoints[0]!.col, row: waypoints[0]!.row }];
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1]!;
    const b = waypoints[i]!;
    if (a.col === b.col) {
      const step = Math.sign(b.row - a.row);
      if (step === 0) continue;
      for (let r = a.row + step; ; r += step) {
        cells.push({ col: a.col, row: r });
        if (r === b.row) break;
      }
    } else if (a.row === b.row) {
      const step = Math.sign(b.col - a.col);
      if (step === 0) continue;
      for (let c = a.col + step; ; c += step) {
        cells.push({ col: c, row: a.row });
        if (c === b.col) break;
      }
    } else {
      throw new Error(`non-axis-aligned waypoint (${a.col},${a.row})→(${b.col},${b.row})`);
    }
  }
  return cells;
}

function buildGrid(cols: number, rows: number, pathCells: ReadonlyArray<GridCoord>): TileType[][] {
  const cells: TileType[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: TileType[] = [];
    for (let c = 0; c < cols; c++) row.push('buildable');
    cells.push(row);
  }
  for (const p of pathCells) {
    if (p.row >= 0 && p.row < rows && p.col >= 0 && p.col < cols) {
      cells[p.row]![p.col] = 'path';
    }
  }
  return cells;
}

// ─── Wave generation ─────────────────────────────────────────────────────────

/** Stable HP/threat scoring used to pick enemy mixes by wave intensity. */
const ENEMY_THREAT: Record<EnemyKind, number> = {
  worm: 1,
  trojan: 3,
  daemon: 8,
  rootkit: 50,
  wraith: 80,
  hypervisor: 130,
  kernelghost: 200,
  'firmware-leech': 280,
  'darknet-titan': 350,
  'quantum-shade': 430,
  'logic-gate': 530,
  voidwalker: 660,
  apex: 820,
};

/** Per-mission kind tier — picks conservative base + heavy kinds so the
 *  Goal-Defense inequality `(8+N)·L ≥ h·N` holds with margin on every
 *  non-boss wave regardless of path length. Heavy kind appears only in the
 *  back half of a mission and is hard-capped in count. */
function kindTierForMission(missionIdx: number): {
  baseKind: EnemyKind;
  heavyKind: EnemyKind | null;
  /** Per-wave heavy count cap; chosen so even short paths stay survivable. */
  heavyCap: number;
} {
  if (missionIdx <= 2) return { baseKind: 'worm',   heavyKind: 'trojan', heavyCap: 4 };
  if (missionIdx <= 5) return { baseKind: 'worm',   heavyKind: 'trojan', heavyCap: 6 };
  if (missionIdx <= 7) return { baseKind: 'trojan', heavyKind: 'daemon', heavyCap: 4 };
  return                       { baseKind: 'trojan', heavyKind: 'daemon', heavyCap: 5 };
}

function generateWaves(
  chapterIdx: number,
  missionIdx: number,
  bossKind: EnemyKind | undefined,
  rng: () => number,
): WaveDef[] {
  const isFinale = missionIdx === MISSIONS_PER_CHAPTER - 1;
  // Wave count scales with mission index. Intro (m=0): 4 waves. Finale (m=9):
  // 13 waves including the boss wave at the end.
  const waveCount = 4 + missionIdx;
  const waves: WaveDef[] = [];
  const tier = kindTierForMission(missionIdx);

  for (let wIdx = 0; wIdx < waveCount; wIdx++) {
    const intensity = wIdx / Math.max(1, waveCount - 1); // 0..1
    const isBossWave = isFinale && bossKind && wIdx === waveCount - 1;
    const groups: SpawnGroup[] = [];

    if (isBossWave) {
      // Adds in front, boss in middle, trojan trail behind. Trojan adds keep
      // h moderate so the Goal-Defense math leaks on the boss alone, not on
      // the swarm.
      groups.push({
        id: 'adds',
        spawnerId: 'main',
        enemyKind: 'trojan',
        count: 6 + Math.floor(rng() * 3),
        spacing: 0.6,
        delay: 0,
      });
      groups.push({
        id: 'boss',
        spawnerId: 'main',
        enemyKind: bossKind!,
        count: 1,
        spacing: 1.0,
        delay: 4 + Math.floor(rng() * 2),
      });
      groups.push({
        id: 'after-boss',
        spawnerId: 'main',
        enemyKind: 'trojan',
        count: 6 + Math.floor(rng() * 4),
        spacing: 0.5,
        delay: 0,
        afterGroupId: 'boss',
      });
    } else {
      // Base creep stream — count scales with intensity + chapter for sustained
      // economy pressure; toughest creep stays light so small grids survive.
      // Mission 0 of chapter 0 trims the count further — onboarding wave.
      const isTutorial = chapterIdx === 0 && missionIdx === 0;
      const baseCount = isTutorial
        ? Math.round(5 + 5 * intensity)
        : Math.round(8 + 10 * intensity + chapterIdx * 1.2);
      groups.push({
        id: 'g1',
        spawnerId: 'main',
        enemyKind: tier.baseKind,
        count: baseCount,
        spacing: Math.max(0.25, 0.7 - intensity * 0.35),
        delay: 0,
      });
      // Heavy kind (next tier up) injected in back half of mission. Hard
      // cap on count to keep `h·N` tractable on short maps.
      if (tier.heavyKind && wIdx >= Math.ceil(waveCount * 0.45)) {
        const heavyCount = Math.max(
          2,
          Math.min(tier.heavyCap, Math.round(2 + intensity * (tier.heavyCap - 2) + chapterIdx * 0.3)),
        );
        groups.push({
          id: 'g2',
          spawnerId: 'main',
          enemyKind: tier.heavyKind,
          count: heavyCount,
          spacing: Math.max(0.6, 1.1 - intensity * 0.3),
          delay: 0,
          afterGroupId: 'g1',
        });
      }
    }

    waves.push({
      delayBeforeStart: Math.round(6 + wIdx * 0.6 + (isBossWave ? 6 : 0)),
      groups,
    });
  }
  return waves;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type GenerationKey = { chapterIdx: number; missionIdx: number };

export function generateLevel(key: GenerationKey): LevelDef {
  const { chapterIdx, missionIdx } = key;
  if (chapterIdx < 0 || chapterIdx >= CHAPTERS.length) {
    throw new Error(`generateLevel: chapterIdx ${chapterIdx} out of range`);
  }
  if (missionIdx < 0 || missionIdx >= MISSIONS_PER_CHAPTER) {
    throw new Error(`generateLevel: missionIdx ${missionIdx} out of range`);
  }

  const chapter = CHAPTERS[chapterIdx]!;
  // Mix chapter and mission into a stable seed; multiplying by 73 prevents
  // adjacent missions from producing near-identical RNG streams.
  const seed = chapterIdx * 73 + missionIdx + 1;
  const seeded = new SeededRng(seed);
  const rng = (): number => seeded.next();

  const tpl = pickTemplate(chapterIdx, missionIdx, rng);
  const pathCells = expandPathCells(tpl.waypoints);
  const grid = buildGrid(tpl.cols, tpl.rows, pathCells);

  // Spawner sits at first waypoint (path entry).
  const spawnerTile: GridCoord = { col: tpl.waypoints[0]!.col, row: tpl.waypoints[0]!.row };

  // Economy + lives scale slightly with chapter; a 4-life buffer keeps a
  // 3-star clear plausible all the way to chapter 9. First mission of
  // chapter 0 gets an extra credit cushion so newcomers can afford a
  // second tower before the wave hits the first bend.
  const tutorialBoost = chapterIdx === 0 && missionIdx === 0 ? 40 : 0;
  const startCredits = 100 + chapterIdx * 22 + missionIdx * 6 + tutorialBoost;
  const startLives = 10 + Math.floor(chapterIdx / 3);

  const isFinale = missionIdx === MISSIONS_PER_CHAPTER - 1;
  const waves = generateWaves(chapterIdx, missionIdx, isFinale ? chapter.bossEnemyKind : undefined, rng);

  // Star thresholds: scale with `startLives` so the curve stays the same
  // shape across chapters. 90% / 60% / 1 life remaining.
  const starThresholds = {
    stars3: Math.max(2, Math.floor(startLives * 0.9)),
    stars2: Math.max(1, Math.floor(startLives * 0.6)),
    stars1: 1,
  };

  // Mission name: short label keyed by (chapter, mission). Pulled from a
  // fixed pool keyed by the mission index so chapter intros / mids / finales
  // read consistently — name pool indexed by missionIdx.
  const name = MISSION_NAMES[missionIdx] ?? `Mission ${missionIdx + 1}`;

  // Unlock chain: first mission of chapter 0 has no prereq; first mission of
  // every other chapter unlocks from the previous chapter's finale; mid
  // missions chain to the previous mission of the same chapter.
  let unlockRequires: string | undefined;
  if (chapterIdx === 0 && missionIdx === 0) {
    unlockRequires = undefined;
  } else if (missionIdx === 0) {
    unlockRequires = levelId(chapterIdx - 1, MISSIONS_PER_CHAPTER - 1);
  } else {
    unlockRequires = levelId(chapterIdx, missionIdx - 1);
  }

  const def: LevelDef = {
    id: levelId(chapterIdx, missionIdx),
    name,
    chapter: chapterIdx,
    ...(unlockRequires !== undefined ? { unlockRequires } : {}),
    grid: { cols: tpl.cols, rows: tpl.rows, cells: grid },
    spawners: [{ id: 'main', tile: spawnerTile }],
    path: tpl.waypoints,
    startCredits,
    startLives,
    waves,
    starThresholds,
  } as LevelDef;
  return def;
}

export function levelId(chapterIdx: number, missionIdx: number): string {
  return `lvl-c${chapterIdx}-m${missionIdx}`;
}

const MISSION_NAMES: ReadonlyArray<string> = [
  'Probe',
  'Foothold',
  'Sweep',
  'Pivot',
  'Staging',
  'Lateral',
  'Escalate',
  'Persist',
  'Exfil',
  'Finale',
];

/** Build the entire campaign deterministically. */
export function generateAllLevels(): ReadonlyArray<DeepReadonly<LevelDef>> {
  const out: LevelDef[] = [];
  for (let c = 0; c < CHAPTERS.length; c++) {
    for (let m = 0; m < MISSIONS_PER_CHAPTER; m++) {
      out.push(generateLevel({ chapterIdx: c, missionIdx: m }));
    }
  }
  return out;
}

export { ENEMY_THREAT };
