import { describe, it, expect } from 'vitest';
import { runMigrations } from '@/meta/migrations';
import {
  blankSaveDataV1,
  blankSaveDataV2,
  blankSaveDataV3,
  blankSaveDataV4,
  CURRENT_VERSION,
  DEFAULT_LOADOUT,
  DEFAULT_UNLOCKED_TOWERS,
} from '@/meta/schema';

describe('runMigrations', () => {
  it('passes v4 through unchanged', () => {
    const data = blankSaveDataV4(123);
    const out = runMigrations({ version: 4, data });
    expect(out).toEqual(data);
  });

  it('migrates v1 → v4 by chaining v1→v2→v3→v4', () => {
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
  });

  it('migrates v2 → v4 stripping the legacy XP fields introduced in v3', () => {
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

  it('migrates v3 → v4 by removing playerXp / playerLevel from a populated v3 save', () => {
    const v3 = blankSaveDataV3(123);
    v3.meta.shards = 99;
    v3.meta.playerXp = 12345;
    v3.meta.playerLevel = 14;
    const out = runMigrations({ version: 3, data: v3 });
    expect((out.meta as Record<string, unknown>)['playerXp']).toBeUndefined();
    expect((out.meta as Record<string, unknown>)['playerLevel']).toBeUndefined();
    expect(out.meta.shards).toBe(99);
  });

  it('preserves populated v1 values across the v1 → v4 chain', () => {
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
    expect(CURRENT_VERSION).toBe(4);
  });
});
