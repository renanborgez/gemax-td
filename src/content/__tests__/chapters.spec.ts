import { describe, it, expect } from 'vitest';
import { CHAPTERS, CHAPTER_BY_INDEX } from '@/content/chapters';
import { ALL_LEVELS, LEVEL_BY_ID } from '@/content/levels';

describe('chapters registry', () => {
  it('every LevelDef.chapter has a corresponding ChapterDef', () => {
    const usedChapters = new Set(ALL_LEVELS.map((l) => l.chapter));
    for (const ch of usedChapters) {
      expect(CHAPTER_BY_INDEX[ch], `chapter ${ch} missing from CHAPTERS`).toBeDefined();
    }
  });

  it('CHAPTER_BY_INDEX matches CHAPTERS by index', () => {
    for (const c of CHAPTERS) {
      expect(CHAPTER_BY_INDEX[c.index]).toBe(c);
    }
  });

  it('every chapter.finaleLevelId references a real level', () => {
    for (const c of CHAPTERS) {
      if (c.finaleLevelId === undefined) continue;
      expect(
        LEVEL_BY_ID[c.finaleLevelId],
        `chapter ${c.index} finaleLevelId "${c.finaleLevelId}" not found`,
      ).toBeDefined();
    }
  });

  it('finaleLevelId belongs to its chapter', () => {
    for (const c of CHAPTERS) {
      if (c.finaleLevelId === undefined) continue;
      const level = LEVEL_BY_ID[c.finaleLevelId];
      expect(level?.chapter).toBe(c.index);
    }
  });

  it('final wave of finaleLevelId spawns the chapter boss', () => {
    for (const c of CHAPTERS) {
      if (c.finaleLevelId === undefined || c.bossEnemyKind === undefined) continue;
      const level = LEVEL_BY_ID[c.finaleLevelId]!;
      const finalWave = level.waves[level.waves.length - 1];
      expect(finalWave, `${c.finaleLevelId} has no waves`).toBeDefined();
      const spawnsBoss = finalWave!.groups.some((g) => g.enemyKind === c.bossEnemyKind);
      expect(
        spawnsBoss,
        `chapter ${c.index} final wave of ${c.finaleLevelId} does not spawn ${c.bossEnemyKind}`,
      ).toBe(true);
    }
  });
});
