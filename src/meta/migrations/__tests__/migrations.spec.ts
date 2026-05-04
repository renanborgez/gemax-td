import { describe, it, expect } from 'vitest';
import { runMigrations } from '@/meta/migrations';
import { blankSaveDataV1, CURRENT_VERSION } from '@/meta/schema';

describe('runMigrations', () => {
  it('passes v1 through unchanged', () => {
    const data = blankSaveDataV1(123);
    const out = runMigrations({ version: 1, data });
    expect(out).toEqual(data);
  });
  it('throws when no migration path exists', () => {
    expect(() => runMigrations({ version: 999, data: {} })).toThrow(/No migration path/);
  });
  it('reports the latest version constant', () => {
    expect(CURRENT_VERSION).toBe(1);
  });
});
