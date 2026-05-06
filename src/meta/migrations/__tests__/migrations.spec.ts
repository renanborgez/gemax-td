import { describe, it, expect } from 'vitest';
import { runMigrations } from '@/meta/migrations';
import {
  blankSaveDataV1,
  blankSaveDataV2,
  blankSaveDataV3,
  blankSaveDataV5,
  blankSaveDataV6,
  CURRENT_VERSION,
  DEFAULT_LOADOUT,
  DEFAULT_UNLOCKED_TOWERS,
  type ChapterUnlockState,
  type SaveDataV4,
} from '@/meta/schema';

describe('runMigrations', () => {
  it('passes v6 through unchanged', () => {
    const data = blankSaveDataV6(123);
    const out = runMigrations({ version: 6, data });
    expect(out).toEqual(data);
  });

  it('migrates v5 → v6 by seeding seenTowers from currently-visible towers', () => {
    const v5 = blankSaveDataV5(123);
    const out = runMigrations({ version: 5, data: v5 });
    // Starters are owned and ungated, so they're visible on a blank save and
    // get pre-acknowledged. No badge spam on first post-update launch.
    expect(out.meta.seenTowers).toEqual(expect.arrayContaining([...DEFAULT_UNLOCKED_TOWERS]));
  });

  it('migrates v1 → v5 by chaining v1→v2→v3→v4→v5', () => {
    const v1 = blankSaveDataV1(123);
    const out = runMigrations({ version: 1, data: v1 });
    expect(out.meta.unlockedTowers).toEqual([...DEFAULT_UNLOCKED_TOWERS]);
    expect(out.meta.activeLoadout).toEqual([...DEFAULT_LOADOUT]);
    expect((out.meta as Record<string, unknown>)['playerXp']).toBeUndefined();
    expect((out.meta as Record<string, unknown>)['playerLevel']).toBeUndefined();
    expect(out.meta.shards).toBe(v1.meta.shards);
    expect(out.meta.techTree).toEqual(v1.meta.techTree);
    expect(out.profile).toEqual(v1.profile);
    expect(out.settings).toEqual(v1.settings);
    expect(out.meta.chapterUnlocks).toEqual({});
  });

  it('migrates v2 → v5 stripping the legacy XP fields introduced in v3', () => {
    const v2 = blankSaveDataV2(123);
    v2.meta.shards = 50;
    v2.meta.techTree = { 'firewall-t1': 1 };
    const out = runMigrations({ version: 2, data: v2 });
    expect((out.meta as Record<string, unknown>)['playerXp']).toBeUndefined();
    expect((out.meta as Record<string, unknown>)['playerLevel']).toBeUndefined();
    expect(out.meta.shards).toBe(50);
    expect(out.meta.techTree).toEqual({ 'firewall-t1': 1 });
    expect(out.meta.unlockedTowers).toEqual(v2.meta.unlockedTowers);
  });

  it('migrates v3 → v5 by removing playerXp / playerLevel from a populated v3 save', () => {
    const v3 = blankSaveDataV3(123);
    v3.meta.shards = 99;
    v3.meta.playerXp = 12345;
    v3.meta.playerLevel = 14;
    const out = runMigrations({ version: 3, data: v3 });
    expect((out.meta as Record<string, unknown>)['playerXp']).toBeUndefined();
    expect((out.meta as Record<string, unknown>)['playerLevel']).toBeUndefined();
    expect(out.meta.shards).toBe(99);
  });

  it('preserves populated v1 values across the v1 → v5 chain', () => {
    const v1 = blankSaveDataV1(123);
    v1.meta.shards = 42;
    v1.meta.techTree = { 'global-reserves': 1 };
    v1.settings.sfx = 0.3;
    v1.settings.tutorialSeen = true;
    v1.campaign['lvl-01-intranet'] = {
      bestStarsByDifficulty: { normal: 2 },
      bestWaveReached: 7,
      cleared: true,
      shardsAwardedFor: ['normal'],
    };
    const out = runMigrations({ version: 1, data: v1 });
    expect(out.meta.shards).toBe(42);
    expect(out.meta.techTree).toEqual({ 'global-reserves': 1 });
    expect(out.settings.sfx).toBe(0.3);
    expect(out.settings.tutorialSeen).toBe(true);
    expect(out.campaign['lvl-01-intranet']).toEqual(v1.campaign['lvl-01-intranet']);
    expect(out.profile).toEqual(v1.profile);
  });

  it('throws when no migration path exists', () => {
    expect(() => runMigrations({ version: 999, data: {} })).toThrow(/No migration path/);
  });

  it('reports the latest version constant', () => {
    expect(CURRENT_VERSION).toBe(6);
  });
});

function v4Blob(
  data: Partial<SaveDataV4['meta']> = {},
  campaign: SaveDataV4['campaign'] = {},
): { version: 4; data: SaveDataV4 } {
  return {
    version: 4,
    data: {
      profile: { createdAt: 1000, lastPlayedAt: 2000 },
      campaign,
      meta: {
        shards: 0,
        techTree: {},
        unlockedTowers: ['bullet-turret', 'logic-bomb'],
        activeLoadout: ['bullet-turret', 'logic-bomb', null],
        ...data,
      },
      settings: {
        audioMaster: 1, sfx: 0.8, music: 0.8,
        difficultyDefault: 'normal', tutorialSeen: false,
      },
    },
  };
}

function fullChapter(ch: number): Record<string, { bestStarsByDifficulty: {}; bestWaveReached: number; cleared: boolean; shardsAwardedFor: [] }> {
  const out: Record<string, { bestStarsByDifficulty: {}; bestWaveReached: number; cleared: boolean; shardsAwardedFor: [] }> = {};
  for (let m = 0; m < 10; m++) {
    out[`lvl-c${ch}-m${m}`] = { bestStarsByDifficulty: {}, bestWaveReached: 0, cleared: true, shardsAwardedFor: [] };
  }
  return out;
}

describe('v4 → v5 migration', () => {
  it('adds empty chapterUnlocks for fresh v4 saves', () => {
    const out = runMigrations(v4Blob());
    expect(out.meta.chapterUnlocks).toEqual({});
  });

  it('backfills rewardClaimedAt for chapters fully cleared in campaign', () => {
    const out = runMigrations(v4Blob({}, fullChapter(0)));
    expect((out.meta.chapterUnlocks as Record<number, ChapterUnlockState>)[0]?.rewardClaimedAt).toBe(2000);
  });

  it('does not flag partially-cleared chapters', () => {
    const partial = fullChapter(0);
    delete partial['lvl-c0-m9'];                // 9 of 10 cleared
    const out = runMigrations(v4Blob({}, partial));
    expect((out.meta.chapterUnlocks as Record<number, unknown>)[0]).toBeUndefined();
  });

  it('preserves unlockedTowers verbatim (no auto-grant)', () => {
    const out = runMigrations(v4Blob({ unlockedTowers: ['bullet-turret', 'logic-bomb', 'sniper'] }, fullChapter(0)));
    expect(out.meta.unlockedTowers).toEqual(['bullet-turret', 'logic-bomb', 'sniper']);
  });
});

describe('runMigrations defensive backfill', () => {
  it('backfills missing chapterUnlocks on v5 blobs (e.g., saves written between schema bump and migration deploy)', () => {
    const v5MissingField = {
      profile: { createdAt: 1, lastPlayedAt: 2 },
      campaign: {},
      meta: {
        shards: 0,
        techTree: {},
        unlockedTowers: ['bullet-turret', 'logic-bomb'],
        activeLoadout: ['bullet-turret', 'logic-bomb', null],
      },
      settings: {
        audioMaster: 1, sfx: 0.8, music: 0.8,
        difficultyDefault: 'normal', tutorialSeen: false,
      },
    };
    const out = runMigrations({ version: 5, data: v5MissingField });
    expect(out.meta.chapterUnlocks).toEqual({});
    // The v5→v6 step then runs and fills seenTowers from the visible set.
    expect(out.meta.seenTowers).toEqual(expect.arrayContaining(['bullet-turret', 'logic-bomb']));
  });

  it('backfills missing seenTowers on v6 blobs', () => {
    const v6MissingField = {
      profile: { createdAt: 1, lastPlayedAt: 2 },
      campaign: {},
      meta: {
        shards: 0,
        techTree: {},
        unlockedTowers: ['bullet-turret', 'logic-bomb'],
        activeLoadout: ['bullet-turret', 'logic-bomb', null],
        chapterUnlocks: {},
      },
      settings: {
        audioMaster: 1, sfx: 0.8, music: 0.8,
        difficultyDefault: 'normal', tutorialSeen: false,
      },
    };
    const out = runMigrations({ version: 6, data: v6MissingField });
    expect(out.meta.seenTowers).toEqual(expect.arrayContaining(['bullet-turret', 'logic-bomb']));
  });
});
