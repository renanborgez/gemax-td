import {
  CURRENT_VERSION,
  DEFAULT_LOADOUT,
  DEFAULT_UNLOCKED_TOWERS,
  type ChapterUnlockState,
  type SaveDataLatest,
  type SaveDataV1,
  type SaveDataV2,
  type SaveDataV3,
  type SaveDataV4,
  type SaveDataV5,
  type SaveDataV6,
} from '@/meta/schema';
import { CHAPTERS } from '@/content/chapters';
import { ALL_TOWER_DEFS } from '@/content/towerDefs';
import type { TowerKind } from '@/content/types';

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
  {
    from: 4,
    to: 5,
    migrate: (d) => {
      const v4 = d as SaveDataV4;
      const chapterUnlocks: Record<number, ChapterUnlockState> = {};
      for (let ch = 0; ch < CHAPTERS.length; ch++) {
        let allCleared = true;
        for (let m = 0; m < 10; m++) {
          if (!v4.campaign[`lvl-c${ch}-m${m}`]?.cleared) { allCleared = false; break; }
        }
        if (allCleared) {
          // Backdate so chaptersClearedNewly() returns nothing on the first
          // post-update match end — returning players don't get celebration spam.
          chapterUnlocks[ch] = { rewardClaimedAt: v4.profile.lastPlayedAt };
        }
      }
      const v5: SaveDataV5 = {
        ...v4,
        meta: { ...v4.meta, chapterUnlocks },
      };
      return v5;
    },
  },
  {
    from: 5,
    to: 6,
    migrate: (d) => {
      // Seed `seenTowers` with everything currently visible (owned + chapter-
      // unlocked listings) so returning players don't get spammed with badges
      // on their first post-update launch. Future unlocks diverge from this
      // snapshot and surface the badge.
      const v5 = d as SaveDataV5;
      const seen = visibleTowerKinds(v5);
      const v6: SaveDataV6 = {
        ...v5,
        meta: { ...v5.meta, seenTowers: seen },
      };
      return v6;
    },
  },
];

/** Towers currently visible to the player on the Towers screen — i.e. either
 *  owned, ungated, or whose chapter gate has been claimed. Used by the V5→V6
 *  migration and as a defensive backfill below. Tolerates a missing
 *  `chapterUnlocks` field — saves written between schema bumps may land here
 *  with that map absent and we still need to compute a sensible seed set. */
function visibleTowerKinds(data: SaveDataV5 | SaveDataV6): TowerKind[] {
  const unlocks: Record<number, ChapterUnlockState> = data.meta.chapterUnlocks ?? {};
  const out: TowerKind[] = [];
  for (const def of ALL_TOWER_DEFS) {
    if (data.meta.unlockedTowers.includes(def.kind)) {
      out.push(def.kind);
      continue;
    }
    const gate = def.unlockedByChapter;
    if (gate === undefined || unlocks[gate]?.rewardClaimedAt) {
      out.push(def.kind);
    }
  }
  return out;
}

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
  // Persisted blobs are an untrusted boundary: a save written between a schema
  // bump and the corresponding migration deploy may be stamped at the latest
  // version without the new required fields. Backfill any required-but-missing
  // meta fields here so consumers can rely on the typed shape.
  const latest = data as SaveDataLatest;
  if (!latest.meta.chapterUnlocks) {
    latest.meta.chapterUnlocks = {};
  }
  if (!latest.meta.seenTowers) {
    latest.meta.seenTowers = visibleTowerKinds(latest);
  }
  return latest;
}
