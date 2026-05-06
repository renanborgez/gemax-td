import { CHAPTERS, CHAPTER_BY_INDEX } from '@/content/chapters';
import { CHAPTER_REWARDS } from '@/content/chapterRewards';
import type { SaveDataLatest } from '@/meta/schema';

/** Resolve the active HUD/TitleScreen chrome palette. Falls back to the
 *  chapter passed in when no override is set or the override references a
 *  palette the player hasn't earned. In-match mission art stays tied to the
 *  current mission's chapter regardless of this override. */
export function resolveChromePalette(
  data: SaveDataLatest,
  fallbackChapterIdx: number,
): { accent: string; secondary: string | undefined } {
  const id = data.meta.activePaletteId;
  if (id !== undefined && id !== 'auto') {
    const found = CHAPTERS.find((ch) => CHAPTER_REWARDS[ch.index]?.paletteId === id);
    if (found && data.meta.chapterUnlocks[found.index]?.rewardClaimedAt) {
      return { accent: found.paletteAccent, secondary: found.paletteSecondary };
    }
  }
  const ch = CHAPTER_BY_INDEX[fallbackChapterIdx] ?? CHAPTERS[0]!;
  return { accent: ch.paletteAccent, secondary: ch.paletteSecondary };
}
