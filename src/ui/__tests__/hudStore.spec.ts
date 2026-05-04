import { describe, it, expect } from 'vitest';
import { useHudStore } from '@/ui/hudStore';

describe('hudStore', () => {
  it('updates lives and bumps flash counter', () => {
    useHudStore.getState().reset();
    expect(useHudStore.getState().lives).toBe(0);
    useHudStore.getState().setLives(20);
    expect(useHudStore.getState().lives).toBe(20);
    expect(useHudStore.getState().flashLives).toBe(1);
  });

  it('reset honors initial overrides', () => {
    useHudStore.getState().reset({ lives: 10, credits: 100, totalWaves: 10 });
    expect(useHudStore.getState().lives).toBe(10);
    expect(useHudStore.getState().credits).toBe(100);
  });
});
