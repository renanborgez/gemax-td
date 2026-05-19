import { describe, it, expect } from 'vitest';
import { applyLevelOverride, LEVEL_OVERRIDES } from '@/content/levels/overrides';
import type { LevelDef } from '@/content/types';

const fakeLevel: LevelDef = {
  id: 'lvl-test-0',
  name: 'Test Level',
  chapter: 0,
  grid: { cols: 4, rows: 4, cells: [['buildable']] as never },
  spawners: [],
  paths: [],
  startCredits: 100,
  startLives: 10,
  waves: [],
  starThresholds: { stars3: 9, stars2: 6, stars1: 1 },
} as LevelDef;

describe('LEVEL_OVERRIDES', () => {
  it('returns the level unchanged when no override is registered', () => {
    expect(LEVEL_OVERRIDES['lvl-test-0']).toBeUndefined();
    expect(applyLevelOverride(fakeLevel)).toBe(fakeLevel);
  });

  it('shallow-merges override fields onto the generated level', () => {
    const base: LevelDef = { ...fakeLevel, id: 'lvl-c0-m0' } as LevelDef;
    const local: Record<string, Partial<LevelDef>> = {
      'lvl-c0-m0': { startCredits: 999, startLives: 25 },
    };
    const override = local['lvl-c0-m0']!;
    const merged = { ...base, ...override } as LevelDef;
    expect(merged.startCredits).toBe(999);
    expect(merged.startLives).toBe(25);
    expect(merged.id).toBe('lvl-c0-m0');
    expect(merged.name).toBe(base.name);
  });

  it('default catalog ships with no overrides registered', () => {
    expect(Object.keys(LEVEL_OVERRIDES)).toHaveLength(0);
  });
});
