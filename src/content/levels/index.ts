import { generateAllLevels } from '@/content/levelGenerator';
import type { LevelDef } from '@/content/types';

/**
 * Campaign levels are generated deterministically from `levelGenerator.ts`
 * — the entire 100-mission catalog (10 chapters × 10 missions) is rebuilt
 * verbatim each load. Edits to a level happen in the generator, not here.
 */
export const ALL_LEVELS: ReadonlyArray<LevelDef> = generateAllLevels();
export const LEVEL_BY_ID: Readonly<Record<string, LevelDef>> =
  Object.fromEntries(ALL_LEVELS.map((l) => [l.id, l]));
