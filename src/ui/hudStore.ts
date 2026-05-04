import { create } from 'zustand';
import type { Difficulty } from '@/content/types';

export type WaveStatus = 'idle' | 'in-progress' | 'cleared';

export type HudState = {
  lives: number;
  credits: number;
  waveIndex: number;
  totalWaves: number;
  waveStatus: WaveStatus;
  speed: 1 | 2 | 3;
  paused: boolean;
  difficulty: Difficulty;
  selectedTowerId: string | null;
  /** Used by HUD overlays to flash on changes. */
  flashLives: number;
  flashCredits: number;
};

export type HudActions = {
  setLives(n: number): void;
  setCredits(n: number): void;
  setWave(i: number, total: number, status: WaveStatus): void;
  setSpeed(s: 1 | 2 | 3): void;
  setPaused(p: boolean): void;
  setDifficulty(d: Difficulty): void;
  setSelectedTowerId(id: string | null): void;
  reset(initial?: Partial<HudState>): void;
};

const INITIAL: HudState = {
  lives: 0, credits: 0, waveIndex: -1, totalWaves: 0, waveStatus: 'idle',
  speed: 1, paused: false, difficulty: 'normal',
  selectedTowerId: null, flashLives: 0, flashCredits: 0,
};

export const useHudStore = create<HudState & HudActions>((set) => ({
  ...INITIAL,
  setLives: (n) => set((s) => ({ lives: n, flashLives: s.flashLives + 1 })),
  setCredits: (n) => set((s) => ({ credits: n, flashCredits: s.flashCredits + 1 })),
  setWave: (i, total, status) => set({ waveIndex: i, totalWaves: total, waveStatus: status }),
  setSpeed: (s) => set({ speed: s }),
  setPaused: (p) => set({ paused: p }),
  setDifficulty: (d) => set({ difficulty: d }),
  setSelectedTowerId: (id) => set({ selectedTowerId: id }),
  reset: (initial) => set({ ...INITIAL, ...initial }),
}));
