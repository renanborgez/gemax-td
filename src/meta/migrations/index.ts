import {
  CURRENT_VERSION,
  DEFAULT_LOADOUT,
  DEFAULT_UNLOCKED_TOWERS,
  type SaveDataLatest,
  type SaveDataV1,
  type SaveDataV2,
  type SaveDataV3,
} from '@/meta/schema';

export type Migration = {
  from: number;
  to: number;
  migrate: (data: unknown) => unknown;
};

export const MIGRATIONS: Migration[] = [
  {
    from: 1,
    to: 2,
    migrate: (d) => {
      // Backfill the loadout fields onto pre-loadout saves. Existing meta keys
      // (shards, techTree) are preserved; everything else is structurally
      // identical between V1 and V2.
      const v1 = d as SaveDataV1;
      const v2: SaveDataV2 = {
        ...v1,
        meta: {
          ...v1.meta,
          unlockedTowers: [...DEFAULT_UNLOCKED_TOWERS],
          activeLoadout: [...DEFAULT_LOADOUT],
        },
      };
      return v2;
    },
  },
  {
    from: 2,
    to: 3,
    migrate: (d) => {
      // Account XP starts at zero for existing players (decision: V3 with
      // zeroed XP — see /Users/renan/.claude/plans/i-want-to-find-optimized-chipmunk.md §7.3).
      const v2 = d as SaveDataV2;
      const v3: SaveDataV3 = {
        ...v2,
        meta: {
          ...v2.meta,
          playerXp: 0,
          playerLevel: 1,
        },
      };
      return v3;
    },
  },
];

export function runMigrations(blob: { version: number; data: unknown }): SaveDataLatest {
  let { version, data } = blob;
  for (const m of MIGRATIONS) {
    if (version === m.from) {
      data = m.migrate(data);
      version = m.to;
    }
  }
  if (version !== CURRENT_VERSION) {
    throw new Error(`No migration path from v${version} to v${CURRENT_VERSION}`);
  }
  return data as SaveDataLatest;
}
