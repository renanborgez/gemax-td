import { describe, it, expect, beforeAll } from 'vitest';
import { canUnlockTower, getTowerStoreEntries } from '@/meta/loadout';
import { blankSaveDataLatest } from '@/meta/schema';
import { bootstrap } from '@/app/bootstrap';

describe('canUnlockTower chapter gate', () => {
  beforeAll(() => { bootstrap(); });

  it('returns chapter-locked reason when chapter not cleared', () => {
    const save = blankSaveDataLatest();
    save.meta.shards = 9999;                    // shards plentiful
    const result = canUnlockTower('sniper', save);   // sniper is unlockedByChapter: 2
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('LOCKED · CHAPTER 02');
  });

  it('returns ok when chapter cleared and shards sufficient', () => {
    const save = blankSaveDataLatest();
    save.meta.shards = 9999;
    save.meta.chapterUnlocks[2] = { rewardClaimedAt: 1 };
    const result = canUnlockTower('sniper', save);
    expect(result.ok).toBe(true);
  });

  it('still returns shard-short when chapter cleared but broke', () => {
    const save = blankSaveDataLatest();
    save.meta.shards = 0;
    save.meta.chapterUnlocks[2] = { rewardClaimedAt: 1 };
    const result = canUnlockTower('sniper', save);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/SHORT/);
  });

  it('OWNED takes precedence over chapter gate', () => {
    const save = blankSaveDataLatest();
    save.meta.unlockedTowers = [...save.meta.unlockedTowers, 'sniper'];
    // chapter NOT cleared, but already owned (e.g., grandfathered from older save)
    const result = canUnlockTower('sniper', save);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('OWNED');
  });
});

describe('getTowerStoreEntries', () => {
  beforeAll(() => { bootstrap(); });

  it('marks starters as owned', () => {
    const entries = getTowerStoreEntries(blankSaveDataLatest());
    const turret = entries.find((e) => e.kind === 'bullet-turret');
    expect(turret?.state).toBe('owned');
  });

  it('marks chapter-locked towers with chapterHint', () => {
    const entries = getTowerStoreEntries(blankSaveDataLatest());
    const sniper = entries.find((e) => e.kind === 'sniper');     // ch2-gated
    expect(sniper?.state).toBe('chapter-locked');
    expect(sniper?.chapterHint?.idx).toBe(2);
    expect(sniper?.chapterHint?.name).toBeTruthy();
  });

  it('marks tower as buyable when chapter cleared and not owned', () => {
    const save = blankSaveDataLatest();
    save.meta.chapterUnlocks[2] = { rewardClaimedAt: 1 };
    const entries = getTowerStoreEntries(save);
    const sniper = entries.find((e) => e.kind === 'sniper');
    expect(sniper?.state).toBe('buyable');
    expect(sniper?.chapterHint).toBeUndefined();
  });
});
