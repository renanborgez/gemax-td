import { describe, it, expect } from 'vitest';
import { resolveChromePalette } from '@/meta/palette';
import { blankSaveDataLatest } from '@/meta/schema';
import { CHAPTERS } from '@/content/chapters';
import { CHAPTER_REWARDS } from '@/content/chapterRewards';

describe('resolveChromePalette', () => {
  it('falls back to fallback chapter when no override is set', () => {
    const save = blankSaveDataLatest();
    const result = resolveChromePalette(save, 3);
    expect(result.accent).toBe(CHAPTERS[3]!.paletteAccent);
    expect(result.secondary).toBe(CHAPTERS[3]!.paletteSecondary);
  });

  it('falls back when override references a palette the player has not earned', () => {
    const save = blankSaveDataLatest();
    save.meta.activePaletteId = CHAPTER_REWARDS[5]!.paletteId;     // palette/darknet
    // chapter 5 not in chapterUnlocks → not earned → fallback
    const result = resolveChromePalette(save, 0);
    expect(result.accent).toBe(CHAPTERS[0]!.paletteAccent);
  });

  it('uses earned override palette', () => {
    const save = blankSaveDataLatest();
    save.meta.chapterUnlocks[5] = { rewardClaimedAt: 1 };
    save.meta.activePaletteId = CHAPTER_REWARDS[5]!.paletteId;
    const result = resolveChromePalette(save, 0);
    expect(result.accent).toBe(CHAPTERS[5]!.paletteAccent);
    expect(result.secondary).toBe(CHAPTERS[5]!.paletteSecondary);
  });

  it('treats explicit "auto" the same as undefined override', () => {
    const save = blankSaveDataLatest();
    save.meta.activePaletteId = 'auto';
    const result = resolveChromePalette(save, 2);
    expect(result.accent).toBe(CHAPTERS[2]!.paletteAccent);
  });

  it('falls back to chapter 0 when fallbackChapterIdx is out of range', () => {
    const save = blankSaveDataLatest();
    const result = resolveChromePalette(save, 999);
    expect(result.accent).toBe(CHAPTERS[0]!.paletteAccent);
  });
});
