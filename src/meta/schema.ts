import type { Difficulty, TowerKind } from '@/content/types';

export type StarCount = 0 | 1 | 2 | 3;

export type LevelProgress = {
  bestStarsByDifficulty: Partial<Record<Difficulty, StarCount>>;
  bestWaveReached: number;
  cleared: boolean;
  shardsAwardedFor: Difficulty[];
};

export type SaveSettings = {
  audioMaster: number;          // 0..1
  sfx: number;                  // 0..1
  music: number;                // 0..1
  difficultyDefault: Difficulty;
  tutorialSeen: boolean;
};

export type SaveDataV1 = {
  profile: { createdAt: number; lastPlayedAt: number };
  campaign: Record<string, LevelProgress>;
  meta: {
    shards: number;
    techTree: Record<string, number>;     // nodeId → tier (0 = locked)
  };
  settings: SaveSettings;
};

export type PersistedBlobV1 = {
  version: 1;
  data: SaveDataV1;
};

/** Towers granted free at first launch (and backfilled into pre-loadout saves). */
export const DEFAULT_UNLOCKED_TOWERS: readonly TowerKind[] = ['firewall', 'logic-bomb'];
/** Loadout cap — only this many towers are usable in a single match. */
export const LOADOUT_SLOTS = 3;
/**
 * Slot-based default loadout. A `null` slot is a reserved empty position that
 * stays put when a tower is removed (the empty square doesn't shift left, and
 * the next deploy fills it before opening a new slot).
 */
export const DEFAULT_LOADOUT: readonly (TowerKind | null)[] = ['firewall', 'logic-bomb', null];

export type SaveDataV2 = {
  profile: { createdAt: number; lastPlayedAt: number };
  campaign: Record<string, LevelProgress>;
  meta: {
    shards: number;
    techTree: Record<string, number>;
    /** Tower kinds the player owns. Starters are seeded; rest must be unlocked with shards. */
    unlockedTowers: TowerKind[];
    /**
     * Fixed-length (LOADOUT_SLOTS) slot array. `null` means the slot is empty
     * and waiting to be filled; removing a tower nulls that slot in place.
     */
    activeLoadout: (TowerKind | null)[];
  };
  settings: SaveSettings;
};

export type PersistedBlobV2 = {
  version: 2;
  data: SaveDataV2;
};

export const CURRENT_VERSION = 2 as const;

export function blankSaveDataV1(now: number = Date.now()): SaveDataV1 {
  return {
    profile: { createdAt: now, lastPlayedAt: now },
    campaign: {},
    meta: { shards: 0, techTree: {} },
    settings: {
      audioMaster: 1.0,
      sfx: 0.8,
      music: 0.8,
      difficultyDefault: 'normal',
      tutorialSeen: false,
    },
  };
}

export function blankSaveDataV2(now: number = Date.now()): SaveDataV2 {
  return {
    profile: { createdAt: now, lastPlayedAt: now },
    campaign: {},
    meta: {
      shards: 0,
      techTree: {},
      unlockedTowers: [...DEFAULT_UNLOCKED_TOWERS],
      activeLoadout: [...DEFAULT_LOADOUT],
    },
    settings: {
      audioMaster: 1.0,
      sfx: 0.8,
      music: 0.8,
      difficultyDefault: 'normal',
      tutorialSeen: false,
    },
  };
}

export type SaveDataLatest = SaveDataV2;
export type PersistedBlobLatest = PersistedBlobV2;
export const blankSaveDataLatest = blankSaveDataV2;
