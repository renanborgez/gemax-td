import { describe, it, expect } from 'vitest';
import {
  isChapterCleared,
  chapterClearProgress,
  chaptersClearedNewly,
  awardChapterClear,
} from '@/meta/chapterProgress';
import { blankSaveDataLatest } from '@/meta/schema';
import type { SaveDataLatest, LevelProgress } from '@/meta/schema';

function withClears(chapter: number, count: number): SaveDataLatest {
  const save = blankSaveDataLatest();
  for (let m = 0; m < count; m++) {
    save.campaign[`lvl-c${chapter}-m${m}`] = clearedProgress();
  }
  return save;
}

function clearedProgress(): LevelProgress {
  return { bestStarsByDifficulty: {}, bestWaveReached: 0, cleared: true, shardsAwardedFor: [] };
}

describe('isChapterCleared', () => {
  it('returns false when no missions cleared', () => {
    expect(isChapterCleared(0, blankSaveDataLatest())).toBe(false);
  });

  it('returns false when 9 of 10 cleared', () => {
    expect(isChapterCleared(0, withClears(0, 9))).toBe(false);
  });

  it('returns true when all 10 cleared', () => {
    expect(isChapterCleared(0, withClears(0, 10))).toBe(true);
  });

  it('returns false when a mission entry exists but cleared=false', () => {
    const save = withClears(0, 10);
    save.campaign['lvl-c0-m5']!.cleared = false;
    expect(isChapterCleared(0, save)).toBe(false);
  });
});

describe('chapterClearProgress', () => {
  it('counts cleared missions out of 10', () => {
    expect(chapterClearProgress(0, withClears(0, 7))).toEqual({ cleared: 7, total: 10 });
  });
});

describe('chaptersClearedNewly', () => {
  it('returns chapters newly cleared (no prior reward)', () => {
    const before = withClears(0, 10);                    // cleared but no rewardClaimedAt
    const after = structuredClone(before);
    expect(chaptersClearedNewly(before, after)).toEqual([0]);
  });

  it('returns empty when prior reward already claimed', () => {
    const before = withClears(0, 10);
    before.meta.chapterUnlocks[0] = { rewardClaimedAt: 1234 };
    const after = structuredClone(before);
    expect(chaptersClearedNewly(before, after)).toEqual([]);
  });

  it('only returns chapters cleared in `next`, not `prev`', () => {
    const before = blankSaveDataLatest();                // empty
    const after = withClears(0, 10);                     // ch0 freshly cleared
    expect(chaptersClearedNewly(before, after)).toEqual([0]);
  });
});

describe('awardChapterClear', () => {
  it('sets rewardClaimedAt on first call', () => {
    const save = blankSaveDataLatest();
    awardChapterClear(save, 3);
    expect(save.meta.chapterUnlocks[3]?.rewardClaimedAt).toBeTypeOf('number');
  });

  it('is idempotent — second call does not bump rewardClaimedAt', () => {
    const save = blankSaveDataLatest();
    awardChapterClear(save, 3);
    const first = save.meta.chapterUnlocks[3]!.rewardClaimedAt;
    awardChapterClear(save, 3);
    expect(save.meta.chapterUnlocks[3]!.rewardClaimedAt).toBe(first);
  });
});
