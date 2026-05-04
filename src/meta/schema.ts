import type { Difficulty } from '@/content/types';

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

export const CURRENT_VERSION = 1 as const;

export function blankSaveDataV1(now: number = Date.now()): SaveDataV1 {
  return {
    profile: { createdAt: now, lastPlayedAt: now },
    campaign: {},
    meta: { shards: 0, techTree: {} },
    settings: {
      audioMaster: 1.0,
      sfx: 1.0,
      music: 0.7,
      difficultyDefault: 'normal',
      tutorialSeen: false,
    },
  };
}

export type SaveDataLatest = SaveDataV1;
