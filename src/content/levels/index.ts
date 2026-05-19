import { generateAllLevels } from '@/content/levelGenerator';
import { applyLevelOverride } from '@/content/levels/overrides';
import type { LevelDef } from '@/content/types';

/**
 * Campaign levels are generated deterministically from `levelGenerator.ts`
 * — the entire 100-mission catalog (10 chapters × 10 missions) is rebuilt
 * verbatim each load. Per-level patches live in `./overrides.ts` and are
 * shallow-merged onto the generated `LevelDef` for hand-tuning specific
 * maps without forking the generator.
 */
export const ALL_LEVELS: ReadonlyArray<LevelDef> =
  generateAllLevels().map((l) => applyLevelOverride(l as LevelDef));
export const LEVEL_BY_ID: Readonly<Record<string, LevelDef>> =
  Object.fromEntries(ALL_LEVELS.map((l) => [l.id, l]));
