import { describe, it, expect } from 'vitest';
import { runMigrations } from '@/meta/migrations';
import { blankSaveDataV1, blankSaveDataV2, CURRENT_VERSION, DEFAULT_LOADOUT, DEFAULT_UNLOCKED_TOWERS } from '@/meta/schema';

describe('runMigrations', () => {
  it('passes v2 through unchanged', () => {
    const data = blankSaveDataV2(123);
    const out = runMigrations({ version: 2, data });
    expect(out).toEqual(data);
  });
  it('migrates v1 → v2 by backfilling loadout fields', () => {
    const v1 = blankSaveDataV1(123);
    const out = runMigrations({ version: 1, data: v1 });
    expect(out.meta.unlockedTowers).toEqual([...DEFAULT_UNLOCKED_TOWERS]);
    expect(out.meta.activeLoadout).toEqual([...DEFAULT_LOADOUT]);
    expect(out.meta.shards).toBe(v1.meta.shards);
    expect(out.meta.techTree).toEqual(v1.meta.techTree);
    expect(out.profile).toEqual(v1.profile);
    expect(out.settings).toEqual(v1.settings);
  });
  it('throws when no migration path exists', () => {
    expect(() => runMigrations({ version: 999, data: {} })).toThrow(/No migration path/);
  });
  it('reports the latest version constant', () => {
    expect(CURRENT_VERSION).toBe(2);
  });
});
