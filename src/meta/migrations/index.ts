import {
  CURRENT_VERSION,
  DEFAULT_LOADOUT,
  DEFAULT_UNLOCKED_TOWERS,
  type SaveDataLatest,
  type SaveDataV1,
  type SaveDataV2,
  type SaveDataV3,
  type SaveDataV4,
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
      // V3 originally introduced account XP fields. V4 strips them again, but
      // the V2→V3 step still has to produce a valid V3 shape so chained
      // migrations from very old saves type-check. The fields are zeroed and
      // immediately removed by the V3→V4 step below.
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
  {
    from: 3,
    to: 4,
    migrate: (d) => {
      // Drop the unused account-XP fields. They were computed on match end but
      // never read by the UI or any gating, so they were removed. Existing
      // saves keep their shards/techTree/loadout intact.
      const v3 = d as SaveDataV3;
      const { playerXp: _xp, playerLevel: _lvl, ...rest } = v3.meta;
      const v4: SaveDataV4 = { ...v3, meta: rest };
      return v4;
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
