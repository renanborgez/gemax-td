import { CHAPTERS } from '@/content/chapters';
import type { SaveDataLatest } from '@/meta/schema';

export function isChapterCleared(chapterIdx: number, save: SaveDataLatest): boolean {
  for (let m = 0; m < 10; m++) {
    const id = `lvl-c${chapterIdx}-m${m}`;
    if (!save.campaign[id]?.cleared) return false;
  }
  return true;
}

export function chapterClearProgress(
  chapterIdx: number,
  save: SaveDataLatest,
): { cleared: number; total: number } {
  let cleared = 0;
  for (let m = 0; m < 10; m++) {
    const id = `lvl-c${chapterIdx}-m${m}`;
    if (save.campaign[id]?.cleared) cleared++;
  }
  return { cleared, total: 10 };
}

export function chaptersClearedNewly(
  prev: SaveDataLatest,
  next: SaveDataLatest,
): number[] {
  const result: number[] = [];
  for (let ch = 0; ch < CHAPTERS.length; ch++) {
    if (prev.meta.chapterUnlocks[ch]?.rewardClaimedAt) continue;
    if (isChapterCleared(ch, next)) result.push(ch);
  }
  return result;
}

export function awardChapterClear(draft: SaveDataLatest, chapterIdx: number): void {
  if (draft.meta.chapterUnlocks[chapterIdx]?.rewardClaimedAt) return;
  draft.meta.chapterUnlocks = {
    ...draft.meta.chapterUnlocks,
    [chapterIdx]: { rewardClaimedAt: Date.now() },
  };
}
