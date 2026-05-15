import type { LevelDef } from '@/content/types';

/**
 * Per-level overrides applied to the procedurally generated catalog. Keyed by
 * `LevelDef.id` (e.g. `lvl-c2-m4`). Each override is a top-level partial that
 * is shallow-merged onto the generated `LevelDef` — fields you specify
 * replace the generated value verbatim; everything else stays generated.
 *
 * Use this to hand-tune specific maps (path, obstacles, dims, waves, economy,
 * star thresholds) without forking the generator. Ships with the build.
 *
 * Note: overrides are blunt instruments. If you replace `paths`, also update
 * `grid.cells` and `spawners` to stay consistent — `generateLevel` would
 * otherwise have done that for you. Replacing `waves` on a chapter finale
 * means you take responsibility for keeping the boss in the final wave (the
 * `chapters` lint test asserts this).
 */
export type LevelOverride = Partial<LevelDef>;

export const LEVEL_OVERRIDES: Readonly<Record<string, LevelOverride>> = {
  // Example:
  // 'lvl-c0-m0': { startCredits: 250, startLives: 15 },
};

export function applyLevelOverride(level: LevelDef): LevelDef {
  const override = LEVEL_OVERRIDES[level.id];
  if (!override) return level;
  return { ...level, ...override } as LevelDef;
}
