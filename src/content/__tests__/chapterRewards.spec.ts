import { describe, it, expect } from 'vitest';
import { CHAPTER_REWARDS } from '@/content/chapterRewards';
import { CHAPTERS } from '@/content/chapters';
import { ALL_TOWER_DEFS } from '@/content/towerDefs';
import type { TowerKind } from '@/content/types';

describe('CHAPTER_REWARDS', () => {
  it('has an entry for every chapter index', () => {
    for (const ch of CHAPTERS) {
      expect(CHAPTER_REWARDS[ch.index]).toBeDefined();
    }
  });

  it('every reward.towerKinds entry resolves to a TowerDef', () => {
    const kinds = new Set(ALL_TOWER_DEFS.map((d) => d.kind));
    for (const ch of CHAPTERS) {
      const rewards = CHAPTER_REWARDS[ch.index]!;
      for (const k of rewards.towerKinds) {
        expect(kinds).toContain(k);
      }
    }
  });

  it('every non-starter tower kind appears in exactly one chapter', () => {
    const STARTERS: readonly TowerKind[] = ['bullet-turret', 'logic-bomb'];
    const seen = new Map<TowerKind, number>();
    for (const ch of CHAPTERS) {
      for (const k of CHAPTER_REWARDS[ch.index]!.towerKinds) {
        seen.set(k, (seen.get(k) ?? 0) + 1);
      }
    }
    for (const def of ALL_TOWER_DEFS) {
      if (STARTERS.includes(def.kind)) continue;
      expect(seen.get(def.kind)).toBe(1);
    }
  });

  it('every paletteId and medalId is unique across chapters', () => {
    const palettes = new Set<string>();
    const medals = new Set<string>();
    for (const ch of CHAPTERS) {
      const r = CHAPTER_REWARDS[ch.index]!;
      expect(palettes.has(r.paletteId)).toBe(false);
      palettes.add(r.paletteId);
      expect(medals.has(r.medalId)).toBe(false);
      medals.add(r.medalId);
    }
  });
});
