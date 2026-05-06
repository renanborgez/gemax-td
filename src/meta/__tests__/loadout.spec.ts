import { describe, it, expect, beforeAll } from 'vitest';
import { canUnlockTower } from '@/meta/loadout';
import { blankSaveDataLatest } from '@/meta/schema';
import { bootstrap } from '@/app/bootstrap';

describe('canUnlockTower chapter gate', () => {
  beforeAll(() => { bootstrap(); });

  it('returns chapter-locked reason when chapter not cleared', () => {
    const save = blankSaveDataLatest();
    save.meta.shards = 9999;                    // shards plentiful
    const result = canUnlockTower('sniper', save);   // sniper is unlockedByChapter: 2
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('LOCKED · CH 02');
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
