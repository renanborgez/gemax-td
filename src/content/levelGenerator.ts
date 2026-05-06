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

import type { LevelDef, EnemyKind, WaveDef, SpawnGroup, Obstacle, ObstacleKind } from '@/content/types';
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
  /** One or more lanes. Each lane is a waypoint sequence; consecutive points
   *  must be axis-aligned. A single-lane template has lanes.length === 1; a
   *  multi-lane template lets enemies enter from multiple spawners and walk
   *  parallel polylines. Self-intersecting waypoints (figure-8, loop) are OK —
   *  enemies walk distance-along-polyline regardless of crossings. */
  lanes: GridCoord[][];
  /** Spawner origins (one per lane). Same length as lanes. */
  spawnerTiles: GridCoord[];
};

/** Per-chapter row stretch: maps grow taller as the campaign progresses so
 *  later chapters feel more sprawling and give towers more coverage real
 *  estate. Capped at +6 rows so the wave-survivability test still leaks at
 *  finale boss waves (`(8+N)·L < h·N`). */
function verticalBoost(chapterIdx: number): number {
  return Math.min(6, Math.floor(chapterIdx * 0.7));
}

/** Bend count range. Driven by the absolute campaign position
 *  (`overall = chapter * 10 + mission`) so each mission is at least as rich
 *  as the previous one, both within a chapter and across chapter rollovers.
 *  min=3 at the very start, climbing to 6 by the campaign finale; max=4
 *  → 10. Actual bend count sampled uniformly inside the range. */
function bendRangeFor(chapterIdx: number, missionIdx: number): [min: number, max: number] {
  const overall = chapterIdx * MISSIONS_PER_CHAPTER + missionIdx; // 0..99
  const min = Math.max(3, 3 + Math.floor(overall / 25));
  const max = Math.min(10, 4 + Math.floor(overall / 8));
  return [min, Math.max(min + 1, max)];
}

/** Map dimensions are also driven by absolute campaign position, so columns
 *  and rows are non-decreasing across the entire 100-mission run. Each
 *  template has a fixed base size (snake1 < snake2 < snake3) so switching
 *  template within a chapter never shrinks the map. */
function dimsFor(
  template: 'snake1' | 'snake2' | 'snake3',
  chapterIdx: number,
  missionIdx: number,
): { cols: number; rows: number } {
  const overall = chapterIdx * MISSIONS_PER_CHAPTER + missionIdx; // 0..99
  switch (template) {
    case 'snake1':
      return { cols: 7 + Math.floor(overall / 25), rows: 11 + Math.floor(overall / 12) };
    case 'snake2':
      return { cols: 10 + Math.floor(overall / 25), rows: 13 + Math.floor(overall / 14) };
    case 'snake3':
      return { cols: 12 + Math.floor(overall / 30), rows: 14 + Math.floor(overall / 16) };
  }
}

/** Build a single snake-style lane: alternating horizontal/vertical segments
 *  driven by `targetBends ∈ [minBends, maxBends]`. Always starts at
 *  (startCol, 0) and terminates at (endCol, rows-1) with axis-aligned
 *  waypoints. Inner-loop alternation guarantees no two consecutive segments
 *  share an axis. */
function buildSnake(
  rng: () => number,
  cols: number, rows: number,
  startCol: number, endCol: number,
  minBends: number, maxBends: number,
): GridCoord[] {
  const targetBends = minBends + Math.floor(rng() * (maxBends - minBends + 1));
  const wp: GridCoord[] = [{ col: startCol, row: 0 }];
  let col = startCol;
  let row = 0;
  // Start horizontal so the first corner forms near the spawn — visually
  // signals "the path is a maze" right at the entry.
  let isHoriz = true;
  const minC = 1, maxC = Math.max(2, cols - 2);

  for (let b = 0; b < targetBends; b++) {
    const remainingBends = targetBends - b - 1;
    if (isHoriz) {
      // Pick a different col within playable strip, biased away from current
      // col so the segment has appreciable length.
      let newCol = col;
      for (let attempt = 0; attempt < 6 && newCol === col; attempt++) {
        newCol = minC + Math.floor(rng() * (maxC - minC + 1));
      }
      if (newCol === col) newCol = col === maxC ? maxC - 1 : col + 1;
      wp.push({ col: newCol, row });
      col = newCol;
    } else {
      // Reserve enough rows for any remaining bends + the final base drop.
      // remainingVertSegments = how many further vertical segments will fire.
      const remainingVertSegments = Math.ceil((remainingBends + 1) / 2);
      const reserved = remainingVertSegments;        // each needs ≥1 row
      const rowsAvail = (rows - 1) - row - reserved;
      if (rowsAvail < 1) break;                      // ran out of room
      const stepCap = Math.max(1, Math.floor(rowsAvail / Math.max(1, remainingVertSegments)));
      const step = 1 + Math.floor(rng() * stepCap);
      const newRow = Math.min(rows - 2, row + step);
      if (newRow === row) break;
      wp.push({ col, row: newRow });
      row = newRow;
    }
    isHoriz = !isHoriz;
  }

  // Termination: route to (endCol, rows-1) without two same-axis segments
  // ending up adjacent. After the loop, `isHoriz` reflects what the NEXT
  // segment would have been; flip it to learn what the LAST one was.
  let lastWasHoriz = !isHoriz;
  if (col !== endCol) {
    // Need a closing horizontal sweep. If the previous segment was already
    // horizontal, inject a small vertical jog first to keep alternation.
    if (lastWasHoriz && row < rows - 2) {
      const jogStep = 1 + Math.floor(rng() * Math.max(1, rows - 2 - row));
      wp.push({ col, row: row + jogStep });
      row += jogStep;
      lastWasHoriz = false;
    }
    wp.push({ col: endCol, row });
    col = endCol;
    lastWasHoriz = true;
  }
  if (row !== rows - 1) {
    if (lastWasHoriz) {
      wp.push({ col: endCol, row: rows - 1 });
    } else {
      // Last move was vertical and we're at endCol; just extend the drop.
      wp.push({ col: endCol, row: rows - 1 });
    }
  }
  return wp;
}

/** Single-lane snake — one rich path. Map dimensions and bend richness both
 *  grow with absolute campaign position so progression never reverses. */
function tplSnake1(rng: () => number, chapterIdx: number, missionIdx: number): Template {
  const [minBends, maxBends] = bendRangeFor(chapterIdx, missionIdx);
  const { cols, rows: baseRows } = dimsFor('snake1', chapterIdx, missionIdx);
  const rows = baseRows + verticalBoost(chapterIdx);
  const startCol = Math.floor(rng() * Math.min(2, cols - 1));
  const endCol = Math.max(0, Math.min(cols - 2, Math.floor(rng() * (cols - 1))));
  const lane = buildSnake(rng, cols, rows, startCol, endCol, minBends, maxBends);
  return { cols, rows, lanes: [lane], spawnerTiles: [lane[0]!] };
}

/** Twin-lane snake — two snakes from opposite top corners converge on a
 *  single base. */
function tplSnake2(rng: () => number, chapterIdx: number, missionIdx: number): Template {
  const [minBends, maxBends] = bendRangeFor(chapterIdx, missionIdx);
  const { cols, rows: baseRows } = dimsFor('snake2', chapterIdx, missionIdx);
  const rows = baseRows + verticalBoost(chapterIdx);
  const baseCol = Math.max(2, Math.min(cols - 3, Math.floor(cols / 2) + Math.floor(rng() * 3) - 1));
  const leftStart = Math.floor(rng() * Math.min(2, cols - 1));
  const rightStart = cols - 2 - Math.floor(rng() * Math.min(2, cols - 1));
  const left = buildSnake(rng, cols, rows, leftStart, baseCol, minBends, maxBends);
  const right = buildSnake(rng, cols, rows, rightStart, baseCol, minBends, maxBends);
  return {
    cols, rows,
    lanes: [left, right],
    spawnerTiles: [left[0]!, right[0]!],
  };
}

/** Tri-lane snake — three snakes converge on a shared base column. */
function tplSnake3(rng: () => number, chapterIdx: number, missionIdx: number): Template {
  const [minBends, maxBends] = bendRangeFor(chapterIdx, missionIdx);
  const { cols, rows: baseRows } = dimsFor('snake3', chapterIdx, missionIdx);
  const rows = baseRows + verticalBoost(chapterIdx);
  const baseCol = Math.floor(cols / 2);
  const leftStart = Math.floor(rng() * Math.min(2, cols - 1));
  const rightStart = cols - 2 - Math.floor(rng() * Math.min(2, cols - 1));
  const midStart = baseCol;
  const left = buildSnake(rng, cols, rows, leftStart, baseCol, minBends, maxBends);
  const right = buildSnake(rng, cols, rows, rightStart, baseCol, minBends, maxBends);
  // Mid lane: dial bends down a touch — three lanes with full bend counts is
  // visually too noisy at small tile sizes.
  const mid = buildSnake(
    rng, cols, rows, midStart, baseCol,
    Math.max(3, minBends - 1),
    Math.max(4, maxBends - 1),
  );
  return {
    cols, rows,
    lanes: [left, mid, right],
    spawnerTiles: [left[0]!, mid[0]!, right[0]!],
  };
}

/**
 * Pick a template per (chapter, mission). Lane count is a deterministic
 * function of (chapter, mission) so progression is monotonic non-decreasing
 * across the entire campaign — within a chapter, every later mission is at
 * least as wide as the previous one, and chapter rollovers never demote.
 *
 *  Lane-count table (m=missionIdx 0..9):
 *
 *    ch | 0 1 2 3 4 5 6 7 8 9
 *    ---+--------------------
 *     0 | 1 1 1 1 1 1 1 1 1 1
 *     1 | 1 1 1 1 1 2 2 2 2 2
 *     2 | 2 2 2 2 2 2 2 2 2 2
 *     3 | 2 2 2 2 2 2 2 2 2 2
 *     4 | 2 2 2 2 2 2 2 2 2 2
 *     5 | 2 2 2 2 2 2 2 2 2 2
 *     6 | 2 2 2 2 2 2 2 2 2 2
 *     7 | 2 2 2 2 2 3 3 3 3 3
 *     8 | 3 3 3 3 3 3 3 3 3 3
 *     9 | 3 3 3 3 3 3 3 3 3 3
 *
 *  Bend count per lane is `bendRangeFor(chapter, mission)` — 3 minimum at
 *  campaign start, climbing to 6 minimum / 10 maximum by ch9 m9.
 */
function pickTemplate(chapterIdx: number, missionIdx: number, rng: () => number): Template {
  const lanes = laneCountFor(chapterIdx, missionIdx);
  if (lanes === 1) return tplSnake1(rng, chapterIdx, missionIdx);
  if (lanes === 2) return tplSnake2(rng, chapterIdx, missionIdx);
  return tplSnake3(rng, chapterIdx, missionIdx);
}

function laneCountFor(chapterIdx: number, missionIdx: number): 1 | 2 | 3 {
  // Finale lane count is the chapter's high-water mark: chapters 7+ finale
  // with three lanes, chapters 1+ finale with at least two, ch0 stays single.
  if (missionIdx === MISSIONS_PER_CHAPTER - 1) {
    if (chapterIdx >= 7) return 3;
    if (chapterIdx >= 1) return 2;
    return 1;
  }
  if (chapterIdx === 0) return 1;
  // First mission index that promotes the chapter to 2-lane / 3-lane.
  // Chosen so each chapter's first mission is ≥ the previous chapter's
  // finale lane count (no cross-chapter regression).
  const tier2: ReadonlyArray<number> = [99, 5, 0, 0, 0, 0, 0, 0, 0, 0];
  const tier3: ReadonlyArray<number> = [99, 99, 99, 99, 99, 99, 99, 5, 0, 0];
  const t2 = tier2[chapterIdx] ?? 99;
  const t3 = tier3[chapterIdx] ?? 99;
  if (missionIdx >= t3) return 3;
  if (missionIdx >= t2) return 2;
  return 1;
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
  mote: 0.3,
  sprite: 0.5,
  worm: 1,
  packet: 1,
  drone: 2.5,
  crawler: 3,
  stalker: 3.5,
  phantom: 3,
  trojan: 3,
  bastion: 2,
  forkbomb: 4,
  cache: 5,
  reaper: 6,
  knight: 6.5,
  sentinel: 6.8,
  construct: 7,
  bulwark: 7,
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

/** Per-(chapter, mission) kind tier — picks chapter-themed base + heavy kinds
 *  so the Goal-Defense inequality `(8+N)·L ≥ h·N` holds with margin on every
 *  non-boss wave regardless of path length. Heavy kind appears only in the
 *  back half of a mission and is hard-capped in count.
 *
 *  Within each band, the heavyKind rotates by chapter so chapters feel
 *  distinct. Mid/late chapters also receive an optional `bonusKind`
 *  (daemon-tier sprinkle) so late campaigns mix three creep families per
 *  wave instead of two. Every non-boss HP stays ≤ daemon's so daemon
 *  remains the toughest creep in mixed waves — preserving the constant
 *  `h = daemon.hp / firewall.dmg` the survivability test relies on. */
function kindTierForMission(chapterIdx: number, missionIdx: number): {
  baseKind: EnemyKind;
  heavyKind: EnemyKind | null;
  /** Per-wave heavy count cap; chosen so even short paths stay survivable. */
  heavyCap: number;
  /** Optional tertiary heavy. Mixed in for late chapters and back-half
   *  missions so the last campaign chapters never look like the first ones. */
  bonusKind?: EnemyKind;
  bonusCap?: number;
} {
  // ─── Per-chapter rotation tables ──────────────────────────────────────────
  // Each table has 10 entries (ch0..ch9). All HP values stay ≤ daemon (130)
  // so daemon remains the toughest non-boss creep.

  // Light band (m3–5, plus chapter ≥4 m0–2). Chapter-themed light specialist.
  const lightHeavyByCh: ReadonlyArray<EnemyKind> = [
    'trojan',   // ch0 — onboarding
    'packet',   // ch1 — runners
    'bastion',  // ch2 — armor lesson
    'drone',    // ch3 — flying intro
    'crawler',  // ch4 — armored mid
    'stalker',  // ch5 — fast mid
    'sprite',   // ch6 — flying runner
    'forkbomb', // ch7 — splitter
    'phantom',  // ch8 — phaser
    'reaper',   // ch9 — fast heavy
  ];
  const lightBaseByCh: ReadonlyArray<EnemyKind> = [
    'worm', 'worm', 'worm', 'worm',
    'mote', 'worm', 'mote', 'packet', 'mote', 'packet',
  ];

  // Mid band (m6–7). Heavier specialist + matching mid base.
  const midHeavyByCh: ReadonlyArray<EnemyKind> = [
    'daemon',  // ch0
    'daemon',  // ch1
    'daemon',  // ch2
    'reaper',  // ch3 — fast heavy
    'cache',   // ch4 — heal-aura
    'knight',  // ch5 — armored heavy
    'sentinel',// ch6 — flying heavy
    'knight',  // ch7 — armor crescendo
    'cache',   // ch8 — heal punish
    'bulwark', // ch9 — tank
  ];
  const midBaseByCh: ReadonlyArray<EnemyKind> = [
    'trojan', 'trojan', 'trojan',
    'crawler', 'stalker', 'crawler', 'stalker', 'phantom', 'crawler', 'stalker',
  ];

  // Late band (m8–9 non-boss). Crescendo specialist + late base rotation.
  const lateHeavyByCh: ReadonlyArray<EnemyKind> = [
    'daemon',    // ch0
    'daemon',    // ch1
    'daemon',    // ch2
    'daemon',    // ch3
    'knight',    // ch4 — armor crescendo
    'bulwark',   // ch5 — tank crescendo
    'construct', // ch6 — splitter crescendo
    'bulwark',   // ch7
    'construct', // ch8
    'bulwark',   // ch9
  ];
  const lateBaseByCh: ReadonlyArray<EnemyKind> = [
    'trojan', 'trojan', 'trojan', 'trojan',
    'crawler', 'stalker', 'crawler', 'phantom', 'stalker', 'crawler',
  ];

  // Bonus daemon-tier sprinkle. Active for chapter ≥5 from m6 onward; chapter
  // ≥7 also gets the sprinkle in m3–5 so the late campaign always mixes
  // three creep families. All HP ≤ daemon — survivability invariant holds.
  const bonusByCh: ReadonlyArray<EnemyKind | null> = [
    null, null, null, null, null,
    'reaper',    // ch5
    'cache',     // ch6
    'knight',    // ch7
    'construct', // ch8
    'daemon',    // ch9
  ];

  const lightBase = lightBaseByCh[chapterIdx] ?? 'worm';
  const lightHeavy = lightHeavyByCh[chapterIdx] ?? 'trojan';
  const midBase = midBaseByCh[chapterIdx] ?? 'trojan';
  const midHeavy = midHeavyByCh[chapterIdx] ?? 'daemon';
  const lateBase = lateBaseByCh[chapterIdx] ?? 'trojan';
  const lateHeavy = lateHeavyByCh[chapterIdx] ?? 'daemon';
  const bonus = bonusByCh[chapterIdx] ?? null;

  // Heavy cap is monotonic non-decreasing across missions so later missions
  // never spawn fewer heavies than earlier ones in the same chapter. Late
  // chapters (≥7) get a bigger cap so the closing campaign feels denser.

  // m0–2 — opening band. Chapters 0–3 keep the classic worm+trojan tutorial
  // cadence; chapters 4+ open with their themed light kit so newcomers see
  // the chapter's signature creep immediately.
  if (missionIdx <= 2) {
    if (chapterIdx <= 3) return { baseKind: 'worm', heavyKind: 'trojan', heavyCap: 4 };
    return { baseKind: lightBase, heavyKind: lightHeavy, heavyCap: 4 };
  }

  // m3–5 — light specialist band.
  if (missionIdx <= 5) {
    return {
      baseKind: lightBase,
      heavyKind: lightHeavy,
      heavyCap: chapterIdx >= 7 ? 6 : 5,
      ...(bonus && chapterIdx >= 7 ? { bonusKind: bonus, bonusCap: 2 } : {}),
    };
  }

  // m6–7 — mid band. Bonus sprinkle for chapter ≥5.
  if (missionIdx <= 7) {
    return {
      baseKind: midBase,
      heavyKind: midHeavy,
      heavyCap: chapterIdx >= 7 ? 7 : 6,
      ...(bonus && chapterIdx >= 5 ? { bonusKind: bonus, bonusCap: 2 } : {}),
    };
  }

  // m8–9 — pre-finale + finale non-boss. Bonus sprinkle scales for chapter ≥5.
  return {
    baseKind: lateBase,
    heavyKind: lateHeavy,
    heavyCap: chapterIdx >= 7 ? 9 : 7,
    ...(bonus && chapterIdx >= 5 ? { bonusKind: bonus, bonusCap: 3 } : {}),
  };
}

/** Boss-wave adds rotation. The chapter boss is the toughest creep in its
 *  wave so survivability is dominated by `h = boss.hp` regardless of add
 *  kind. Picking a heavier add per chapter (still ≤ daemon HP) makes the
 *  finale feel chapter-specific instead of every boss arriving with baby
 *  trojans. */
const BOSS_ADD_KIND_BY_CHAPTER: ReadonlyArray<EnemyKind> = [
  'trojan',    // ch0 — Rootkit
  'trojan',    // ch1 — Wraith
  'crawler',   // ch2 — Hypervisor
  'reaper',    // ch3 — Kernelghost
  'knight',    // ch4 — Firmware Leech
  'bulwark',   // ch5 — Darknet Titan
  'construct', // ch6 — Quantum Shade
  'knight',    // ch7 — Logic Gate
  'bulwark',   // ch8 — Voidwalker
  'daemon',    // ch9 — Apex
];

/** Spread a single-lane group set across N spawners by splitting counts and
 *  rewriting ids/spawnerId per lane. Boss / chained-after groups inherit the
 *  same per-lane id rewrite so the afterGroupId chain stays valid. */
function spreadAcrossLanes(
  groups: SpawnGroup[],
  spawnerIds: ReadonlyArray<string>,
): SpawnGroup[] {
  if (spawnerIds.length <= 1) return groups;
  const out: SpawnGroup[] = [];
  for (const g of groups) {
    const perLane = Math.max(1, Math.floor(g.count / spawnerIds.length));
    let remaining = g.count;
    for (let i = 0; i < spawnerIds.length; i++) {
      const isLast = i === spawnerIds.length - 1;
      const cnt = isLast ? remaining : perLane;
      remaining -= cnt;
      const sid = spawnerIds[i]!;
      out.push({
        id: `${g.id}-${sid}`,
        spawnerId: sid,
        enemyKind: g.enemyKind,
        count: cnt,
        spacing: g.spacing,
        delay: g.delay,
        ...(g.afterGroupId !== undefined ? { afterGroupId: `${g.afterGroupId}-${sid}` } : {}),
      });
    }
  }
  return out;
}

function generateWaves(
  chapterIdx: number,
  missionIdx: number,
  bossKind: EnemyKind | undefined,
  spawnerIds: ReadonlyArray<string>,
  rng: () => number,
): WaveDef[] {
  const isFinale = missionIdx === MISSIONS_PER_CHAPTER - 1;
  // Wave count scales with mission index. Intro (m=0): 4 waves. Finale (m=9):
  // 13 waves including the boss wave at the end.
  const waveCount = 4 + missionIdx;
  const waves: WaveDef[] = [];
  const tier = kindTierForMission(chapterIdx, missionIdx);

  for (let wIdx = 0; wIdx < waveCount; wIdx++) {
    const intensity = wIdx / Math.max(1, waveCount - 1); // 0..1
    const isBossWave = isFinale && bossKind && wIdx === waveCount - 1;
    const groups: SpawnGroup[] = [];

    if (isBossWave) {
      // Boss wave keeps all groups on the lead spawner — the boss enters
      // from a single front so it reads as the climax. Multi-lane finales
      // still funnel into the same Core, so this stays visually coherent.
      const lead = spawnerIds[0]!;
      const addKind = BOSS_ADD_KIND_BY_CHAPTER[chapterIdx] ?? 'trojan';
      groups.push({
        id: 'adds',
        spawnerId: lead,
        enemyKind: addKind,
        count: 6 + Math.floor(rng() * 3),
        spacing: 0.6,
        delay: 0,
      });
      groups.push({
        id: 'boss',
        spawnerId: lead,
        enemyKind: bossKind!,
        count: 1,
        spacing: 1.0,
        delay: 4 + Math.floor(rng() * 2),
      });
      groups.push({
        id: 'after-boss',
        spawnerId: lead,
        enemyKind: addKind,
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
      // Bonus daemon-tier sprinkle — small count, only on back-third waves
      // so early-wave economy stays manageable. Late chapters always run
      // three creep families per wave once intensity crosses the threshold.
      if (tier.bonusKind && tier.bonusCap && wIdx >= Math.ceil(waveCount * 0.6)) {
        const cap = tier.bonusCap;
        const bonusCount = Math.max(
          1,
          Math.min(cap, Math.round(1 + intensity * (cap - 1))),
        );
        groups.push({
          id: 'g3',
          spawnerId: 'main',
          enemyKind: tier.bonusKind,
          count: bonusCount,
          spacing: Math.max(0.7, 1.2 - intensity * 0.3),
          delay: 0,
          afterGroupId: 'g2',
        });
      }
    }

    // Boss waves stay on the lead spawner; non-boss waves split across all
    // spawners so multi-lane levels show enemies entering from each front.
    const finalGroups = isBossWave ? groups : spreadAcrossLanes(groups, spawnerIds);
    waves.push({
      delayBeforeStart: Math.round(6 + wIdx * 0.6 + (isBossWave ? 6 : 0)),
      groups: finalGroups,
    });
  }
  return waves;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type GenerationKey = { chapterIdx: number; missionIdx: number };

export function generateLevel(key: GenerationKey, seedOverride?: number): LevelDef {
  const { chapterIdx, missionIdx } = key;
  if (chapterIdx < 0 || chapterIdx >= CHAPTERS.length) {
    throw new Error(`generateLevel: chapterIdx ${chapterIdx} out of range`);
  }
  if (missionIdx < 0 || missionIdx >= MISSIONS_PER_CHAPTER) {
    throw new Error(`generateLevel: missionIdx ${missionIdx} out of range`);
  }

  const chapter = CHAPTERS[chapterIdx]!;
  // Mix chapter and mission into a stable seed; multiplying by 73 prevents
  // adjacent missions from producing near-identical RNG streams. The retry
  // loop in `generateAllLevels` may pass a bumped `seedOverride` when a path
  // collides with an earlier mission's fingerprint.
  const seed = seedOverride ?? (chapterIdx * 73 + missionIdx + 1);
  const seeded = new SeededRng(seed);
  const rng = (): number => seeded.next();

  const tpl = pickTemplate(chapterIdx, missionIdx, rng);
  // Union of every lane's expanded path cells → grid paint.
  const allPathCells: GridCoord[] = [];
  for (const lane of tpl.lanes) {
    for (const c of expandPathCells(lane)) allPathCells.push(c);
  }
  const grid = buildGrid(tpl.cols, tpl.rows, allPathCells);

  // One spawner per lane. Lane 0 keeps the canonical 'main' id for back-compat
  // with single-lane wave authoring; subsequent lanes get 'lane-N'.
  const spawners = tpl.lanes.map((_lane, i) => ({
    id: i === 0 ? 'main' : `lane-${i + 1}`,
    tile: { col: tpl.spawnerTiles[i]!.col, row: tpl.spawnerTiles[i]!.row },
    pathIndex: i,
  }));
  const spawnerIds = spawners.map((s) => s.id);

  // Economy + lives scale slightly with chapter; a 4-life buffer keeps a
  // 3-star clear plausible all the way to chapter 9. First mission of
  // chapter 0 gets an extra credit cushion so newcomers can afford a
  // second tower before the wave hits the first bend.
  const tutorialBoost = chapterIdx === 0 && missionIdx === 0 ? 40 : 0;
  const startCredits = 100 + chapterIdx * 22 + missionIdx * 6 + tutorialBoost;
  const startLives = 10 + Math.floor(chapterIdx / 3);

  const isFinale = missionIdx === MISSIONS_PER_CHAPTER - 1;
  const waves = generateWaves(
    chapterIdx, missionIdx, isFinale ? chapter.bossEnemyKind : undefined,
    spawnerIds, rng,
  );

  // Non-placable obstacles enter the campaign at chapter 3. Each obstacle
  // mutates `grid` to 'blocked' and is also recorded in the returned array
  // so the renderer can draw a per-kind sprite. Endpoint rows are excluded
  // because World.ts later forces them all-blocked anyway.
  const endpointRows = new Set<number>();
  for (const lane of tpl.lanes) {
    const last = lane[lane.length - 1];
    if (last) endpointRows.add(last.row);
  }
  const obstacles = chapterIdx >= 3
    ? scatterObstacles(rng, tpl.cols, tpl.rows, grid, chapterIdx, missionIdx, endpointRows)
    : [];

  // Star thresholds: scale with `startLives` so the curve stays the same
  // shape across chapters. 90% / 60% / 1 life remaining.
  const starThresholds = {
    stars3: Math.max(2, Math.floor(startLives * 0.9)),
    stars2: Math.max(1, Math.floor(startLives * 0.6)),
    stars1: 1,
  };

  // Mission name: unique label per (chapter, mission). Each chapter has a
  // themed pool of 10 names so finales read climactic and the campaign
  // never repeats a mission title.
  const name =
    MISSION_NAMES_BY_CHAPTER[chapterIdx]?.[missionIdx]
    ?? `Mission ${chapterIdx + 1}-${missionIdx + 1}`;

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
    spawners,
    paths: tpl.lanes,
    startCredits,
    startLives,
    waves,
    starThresholds,
    ...(obstacles.length > 0 ? { obstacles } : {}),
  } as LevelDef;
  return def;
}

/** Scatter non-placable obstacles onto buildable tiles. Density rises with
 *  campaign progress; cap at 12% of total cells so the player always has
 *  ample tower real estate. Kind palette evolves: crates ch3-4, rockets join
 *  at ch5, voids join at ch7. */
function scatterObstacles(
  rng: () => number,
  cols: number,
  rows: number,
  grid: TileType[][],
  chapterIdx: number,
  missionIdx: number,
  excludeRows: ReadonlySet<number>,
): Obstacle[] {
  const overall = chapterIdx * MISSIONS_PER_CHAPTER + missionIdx;
  // Linear ramp from chapter 3 onward: ch3 m0 ≈ 2 obstacles, ch9 m9 ≈ 25.
  const ramp = Math.max(2, Math.floor((overall - 28) / 3));
  const cap = Math.max(2, Math.floor(cols * rows * 0.12));
  const target = Math.min(ramp, cap);
  if (target <= 0) return [];

  const candidates: GridCoord[] = [];
  for (let r = 0; r < rows; r++) {
    if (excludeRows.has(r)) continue;
    for (let c = 0; c < cols; c++) {
      if (grid[r]![c] === 'buildable') candidates.push({ col: c, row: r });
    }
  }

  // Partial Fisher–Yates: deterministic, uniform without copying the array.
  const take = Math.min(target, candidates.length);
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(rng() * (candidates.length - i));
    const tmp = candidates[i]!;
    candidates[i] = candidates[j]!;
    candidates[j] = tmp;
  }

  const kindPool: ReadonlyArray<ObstacleKind> =
    chapterIdx >= 7 ? ['void', 'rocket', 'crate']
    : chapterIdx >= 5 ? ['rocket', 'crate']
    : ['crate'];

  const out: Obstacle[] = [];
  for (let i = 0; i < take; i++) {
    const p = candidates[i]!;
    grid[p.row]![p.col] = 'blocked';
    const kind = kindPool[Math.floor(rng() * kindPool.length)] ?? 'crate';
    out.push({ col: p.col, row: p.row, kind });
  }
  return out;
}

export function levelId(chapterIdx: number, missionIdx: number): string {
  return `lvl-c${chapterIdx}-m${missionIdx}`;
}

// Themed mission names per chapter. Order matches CHAPTERS in chapters.ts:
// 0 Intranet, 1 Uplink, 2 Cloud Layer, 3 Mainframe, 4 Firmware,
// 5 Darknet, 6 Quantum, 7 Logic, 8 Void, 9 Apex.
const MISSION_NAMES_BY_CHAPTER: ReadonlyArray<ReadonlyArray<string>> = [
  // Intranet — corporate LAN intrusion arc.
  ['Recon Ping', 'Open Port', 'Mailroom Sweep', 'Lateral Hop', 'VPN Tap',
   'Subnet Crawl', 'Privilege Climb', 'Backdoor Daemon', 'Email Heist', 'Domain Takeover'],
  // Uplink — satellite/comms.
  ['Signal Trace', 'Antenna Lock', 'Carrier Wave', 'Beam Splitter', 'Relay Hijack',
   'Transponder', 'Frequency Hop', 'Ground Station', 'Payload Drop', 'Orbital Override'],
  // Cloud Layer — cloud infra.
  ['Edge Probe', 'Region Breach', 'Auto-Scale', 'Container Drift', 'Load Balancer',
   'Service Mesh', 'Serverless Storm', 'Bucket Crawl', 'DNS Poison', 'Cloud Collapse'],
  // Mainframe — legacy big iron.
  ['Tape Sweep', 'Console Login', 'Job Queue', 'Batch Crash', 'Punchcard',
   'Z/OS Pivot', 'Vault Trace', 'Ledger Pull', 'Tape Archive', 'Mainframe Meltdown'],
  // Firmware — embedded / low-level.
  ['Boot Sector', 'Flash Wipe', 'Bootloader', 'Microcode', 'ROM Patch',
   'Driver Inject', 'Bus Sniff', 'Kernel Hook', 'Bricked', 'Silicon Override'],
  // Darknet — anonymous networks.
  ['Onion Peel', 'Tor Relay', 'Drop Site', 'Shadow Market', 'Crypt Drop',
   'Cipher Lounge', 'Dead Drop', 'Black Mirror', 'Ghost Wire', 'Darknet Purge'],
  // Quantum — qubits / quantum compute.
  ['Qubit Tap', 'Decoherence', 'Entangle', 'Wave Collapse', 'Superposition',
   'Spin Lock', 'Tunneling', 'Bloch Sphere', 'Annealer', 'Quantum Supremacy'],
  // Logic — formal logic / proofs / AI.
  ['Truth Table', 'Inference', 'Predicate', 'Tautology', 'Recursion',
   'Halting Test', 'Proof Step', 'Lambda', 'Paradox', "Gödel's End"],
  // Void — cosmic / abstract.
  ['Null Sector', 'Event Horizon', 'Singularity', 'Heat Death', 'Dark Matter',
   'Vacuum', 'Causal Loop', 'Entropy Rise', 'Big Crunch', 'Void Genesis'],
  // Apex — climactic.
  ['Ascension', 'Last Bastion', 'Final Sweep', 'Pinnacle', 'Throne Room',
   'Sovereign', 'Apex Pulse', 'Crown Break', 'Endgame', 'GeMax'],
];

/** Hash a level's lane geometry. Two levels with the same fingerprint have
 *  visually identical paths even if waves / economy differ — for the
 *  uniqueness pass we only care about the path silhouette. */
function pathFingerprint(level: LevelDef): string {
  return level.paths
    .map((lane) => lane.map((wp) => `${wp.col},${wp.row}`).join('|'))
    .join(';');
}

/** Build the entire campaign deterministically. Each mission's path must be
 *  unique across the catalog; if the canonical seed produces a path already
 *  emitted by an earlier mission, bump the seed and try again. Up to
 *  `MAX_PATH_RETRIES` attempts; if every retry collides, accept the last
 *  attempt (extremely unlikely with the variety the templates emit). */
const MAX_PATH_RETRIES = 64;
const PATH_SEED_STRIDE = 10007; // prime; keeps retry seeds well-separated.

export function generateAllLevels(): ReadonlyArray<DeepReadonly<LevelDef>> {
  const out: LevelDef[] = [];
  const seenPaths = new Set<string>();
  for (let c = 0; c < CHAPTERS.length; c++) {
    for (let m = 0; m < MISSIONS_PER_CHAPTER; m++) {
      const baseSeed = c * 73 + m + 1;
      let chosen: LevelDef | null = null;
      for (let attempt = 0; attempt < MAX_PATH_RETRIES; attempt++) {
        const seed = baseSeed + attempt * PATH_SEED_STRIDE;
        const lvl = generateLevel({ chapterIdx: c, missionIdx: m }, seed);
        const fp = pathFingerprint(lvl);
        if (!seenPaths.has(fp)) {
          seenPaths.add(fp);
          chosen = lvl;
          break;
        }
        if (attempt === MAX_PATH_RETRIES - 1) {
          // Exhausted retries; accept the last attempt rather than fail
          // generation. Catalog still loads, just with one duplicate path.
          chosen = lvl;
        }
      }
      out.push(chosen!);
    }
  }
  return out;
}

export { ENEMY_THREAT };
