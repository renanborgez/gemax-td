import { describe, it, expect } from 'vitest';
import {
  pathLength,
  waveSurvivability,
  levelSurvivability,
} from '@/content/waveSurvivability';
import { ALL_LEVELS, LEVEL_BY_ID } from '@/content/levels';
import { CHAPTER_BY_INDEX } from '@/content/chapters';

describe('pathLength', () => {
  it('returns positive lengths for every generated campaign level', () => {
    for (const level of ALL_LEVELS) {
      expect(pathLength(level), level.id).toBeGreaterThan(0);
    }
  });

  it('returns 0 for a degenerate single-point path', () => {
    const sample = ALL_LEVELS[0]!;
    const fake = { ...sample, paths: [[{ col: 1, row: 1 }]] };
    expect(pathLength(fake)).toBe(0);
  });
});

describe('waveSurvivability — Goal-Defense inequality', () => {
  it('reports a positive enemy count and toughest creep for the first wave of every level', () => {
    for (const level of ALL_LEVELS) {
      const r = waveSurvivability(level, 0);
      expect(r.enemyCount, level.id).toBeGreaterThan(0);
      expect(r.toughestKind, level.id).toBeDefined();
    }
  });

  it('throws on out-of-range waveIndex', () => {
    const sample = ALL_LEVELS[0]!;
    expect(() => waveSurvivability(sample, 999)).toThrow();
  });
});

describe('levelSurvivability — full pass on the generated campaign', () => {
  it('emits one entry per wave', () => {
    for (const level of ALL_LEVELS) {
      expect(levelSurvivability(level).length, level.id).toBe(level.waves.length);
    }
  });

  it('every non-finale wave is survivable; boss waves of finale levels are not', () => {
    for (const level of ALL_LEVELS) {
      const isFinale = CHAPTER_BY_INDEX[level.chapter]?.finaleLevelId === level.id;
      const rows = levelSurvivability(level);
      const lastIndex = rows.length - 1;
      for (const row of rows) {
        if (isFinale && row.waveIndex === lastIndex) {
          expect(row.survivable, `${level.id} boss wave`).toBe(false);
        } else {
          expect(
            row.survivable,
            `${level.id} wave ${row.waveIndex} should be survivable (margin=${row.marginRatio.toFixed(2)})`,
          ).toBe(true);
        }
      }
    }
  });

  it('marginRatio is finite and > 0 for every wave (no zero-enemy waves)', () => {
    for (const level of ALL_LEVELS) {
      for (const row of levelSurvivability(level)) {
        expect(Number.isFinite(row.marginRatio), `${level.id} w${row.waveIndex}`).toBe(true);
        expect(row.marginRatio).toBeGreaterThan(0);
      }
    }
  });

  it('catalog has 100 missions across 10 chapters', () => {
    expect(ALL_LEVELS.length).toBe(100);
    const byChapter = new Map<number, number>();
    for (const l of ALL_LEVELS) {
      byChapter.set(l.chapter, (byChapter.get(l.chapter) ?? 0) + 1);
    }
    for (const [ch, count] of byChapter) {
      expect(count, `chapter ${ch}`).toBe(10);
    }
  });

  it('every chapter finale id resolves to a real level', () => {
    for (const c of Object.values(CHAPTER_BY_INDEX)) {
      if (!c.finaleLevelId) continue;
      expect(LEVEL_BY_ID[c.finaleLevelId], c.finaleLevelId).toBeDefined();
    }
  });

  it('no level has a zero-bend path (spawn → base must turn at least once)', () => {
    for (const level of ALL_LEVELS) {
      // Each lane with N waypoints has N-1 segments; we want at least 2 segments
      // (i.e. at least one bend), so >= 3 waypoints per lane.
      for (const [i, lane] of level.paths.entries()) {
        expect(lane.length, `${level.id} lane ${i} waypoints`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
