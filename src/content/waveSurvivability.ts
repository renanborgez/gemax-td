/**
 * Goal-Defense survivability check (Game Developer Magazine, "Balance in TD games").
 *
 *   (8 + N) · L  vs  h · N
 *
 *   N = enemies in wave
 *   L = path length in tiles (proxy for tiles under tower coverage)
 *   h = shots-to-kill of the toughest creep, measured against a baseline turret
 *
 * `lhs >= rhs` means the wave is comfortably survivable with optimal play.
 * `lhs <  rhs` means the wave is engineered to leak — appropriate for boss
 * waves but a red flag for early/mid waves.
 *
 * This is a *diagnostic* — report, don't enforce. Boss waves are intentionally
 * unsurvivable by this metric; that's how the article defines them.
 */
import type { LevelDef, WaveDef, EnemyKind } from '@/content/types';
import { ALL_ENEMY_DEFS } from '@/content/enemyDefs';
import { FIREWALL } from '@/content/towerDefs';

const ENEMY_HP_BY_KIND: Readonly<Record<EnemyKind, number>> = Object.fromEntries(
  ALL_ENEMY_DEFS.map((e) => [e.kind, e.baseStats.hp]),
) as Record<EnemyKind, number>;

/** Baseline shot damage used to convert HP → shots-to-kill. Firewall is the
 *  canonical "first turret" — its base damage is the unit. */
export const BASELINE_SHOT_DAMAGE = FIREWALL.baseStats.damage;

/** Sum of axis-aligned segment lengths along the level path, in tiles. */
export function pathLength(level: LevelDef): number {
  let total = 0;
  for (let i = 1; i < level.path.length; i++) {
    const a = level.path[i - 1]!;
    const b = level.path[i]!;
    total += Math.abs(b.col - a.col) + Math.abs(b.row - a.row);
  }
  return total;
}

export type WaveSurvivability = {
  waveIndex: number;
  enemyCount: number;
  toughestKind: EnemyKind;
  shotsToKill: number;
  pathTiles: number;
  /** (8 + N) · L */
  lhs: number;
  /** h · N */
  rhs: number;
  /** lhs / rhs. >= 1.0 = survivable; < 1.0 = engineered to leak (boss-tier). */
  marginRatio: number;
  survivable: boolean;
};

export function waveSurvivability(
  level: LevelDef,
  waveIndex: number,
): WaveSurvivability {
  const wave = level.waves[waveIndex];
  if (!wave) throw new Error(`waveIndex ${waveIndex} out of range for ${level.id}`);
  return computeWaveSurvivability(wave, waveIndex, pathLength(level));
}

function computeWaveSurvivability(
  wave: WaveDef,
  waveIndex: number,
  L: number,
): WaveSurvivability {
  let N = 0;
  let toughestKind: EnemyKind = wave.groups[0]!.enemyKind;
  let toughestHp = ENEMY_HP_BY_KIND[toughestKind];
  for (const group of wave.groups) {
    N += group.count;
    const hp = ENEMY_HP_BY_KIND[group.enemyKind];
    if (hp > toughestHp) {
      toughestHp = hp;
      toughestKind = group.enemyKind;
    }
  }
  const h = toughestHp / BASELINE_SHOT_DAMAGE;
  const lhs = (8 + N) * L;
  const rhs = h * N;
  const marginRatio = rhs === 0 ? Infinity : lhs / rhs;
  return {
    waveIndex,
    enemyCount: N,
    toughestKind,
    shotsToKill: h,
    pathTiles: L,
    lhs,
    rhs,
    marginRatio,
    survivable: lhs >= rhs,
  };
}

export function levelSurvivability(level: LevelDef): WaveSurvivability[] {
  const L = pathLength(level);
  return level.waves.map((w, i) => computeWaveSurvivability(w, i, L));
}
