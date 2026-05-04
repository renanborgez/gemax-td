import { useEffect, useMemo, useRef } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { AppState } from 'react-native';
import { Engine, type Clock } from '@/engine/Engine';
import { createWorld, type World, type RedrawPort } from '@/world/World';
import { buildEffectsContext } from '@/meta/TechTree';
import { TECH_NODES } from '@/content/techNodes';
import { LEVEL_BY_ID } from '@/content/levels';
import { attachEventBridge } from '@/ui/eventBridge';
import { useHudStore } from '@/ui/hudStore';
import { useSave } from '@/app/providers/SaveProvider';
import { useAudio } from '@/app/providers/AudioProvider';
import type { Difficulty } from '@/content/types';

export type GameSession = {
  worldRef: { current: World };
  redrawTick: SharedValue<number>;
  /** UI commands. */
  startNextWave(): void;
  setSpeed(s: 1 | 2 | 3): void;
  pause(): void;
  resume(): void;
  isPaused(): boolean;
};

export function useGameSession(opts: { levelId: string; difficulty: Difficulty; seed: number }): GameSession {
  const { data, store, refresh } = useSave();
  const audio = useAudio();
  const redrawTick = useSharedValue(0);
  const worldRef = useRef<World | null>(null);
  const engineRef = useRef<Engine | null>(null);

  // Build world once per match.
  if (!worldRef.current) {
    const level = LEVEL_BY_ID[opts.levelId];
    if (!level) throw new Error(`unknown level ${opts.levelId}`);
    const effects = buildEffectsContext(TECH_NODES, data);
    const redraw: RedrawPort = { bump: () => { redrawTick.value = redrawTick.value + 1; } };
    worldRef.current = createWorld({
      level, difficulty: opts.difficulty, seed: opts.seed, effects, redraw,
    });
    useHudStore.getState().reset({
      lives: worldRef.current.lives,
      credits: worldRef.current.credits,
      totalWaves: level.waves.length,
      waveIndex: -1,
      waveStatus: 'idle',
      difficulty: opts.difficulty,
      speed: 1,
      paused: false,
    });
  }

  const session = useMemo<GameSession>(() => {
    const w = worldRef.current!;
    const clock: Clock = {
      now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
      schedule: (cb) => {
        const id = requestAnimationFrame(cb);
        return () => cancelAnimationFrame(id);
      },
    };
    const engine = new Engine(w, clock, {
      onMatchEnded(world, won) {
        const lives = world.lives;
        const t = world.level.starThresholds;
        const stars: 0 | 1 | 2 | 3 = lives >= t.stars3 ? 3 : lives >= t.stars2 ? 2 : lives > 0 ? 1 : 0;
        if (won) {
          store.update((d) => {
            const lvl = (d.campaign[world.level.id] ??= {
              bestStarsByDifficulty: {}, bestWaveReached: 0, cleared: false, shardsAwardedFor: [],
            });
            const prev = lvl.bestStarsByDifficulty[opts.difficulty] ?? 0;
            if (stars > prev) lvl.bestStarsByDifficulty[opts.difficulty] = stars;
            lvl.cleared = true;
            lvl.bestWaveReached = world.waveDirector.totalWaves;
            if (!lvl.shardsAwardedFor.includes(opts.difficulty)) {
              const award = Math.round(stars * 10 * world.difficulty.shardRewardMult * (1 + 0.05 * world.level.chapter));
              d.meta.shards += award;
              lvl.shardsAwardedFor.push(opts.difficulty);
            }
          });
          refresh();
          audio.playSfx('win');
        } else {
          audio.playSfx('lose');
        }
      },
    });
    engineRef.current = engine;
    attachEventBridge(w.bus);

    // Wire SFX cues.
    w.bus.on('enemy-died', () => audio.playSfx('enemy-death'));
    w.bus.on('life-lost', () => audio.playSfx('life-lost'));
    w.bus.on('wave-started', () => audio.playSfx('wave-start'));
    w.bus.on('tower-placed', () => audio.playSfx('tower-placed'));

    engine.start();

    return {
      worldRef: worldRef as { current: World },
      redrawTick,
      startNextWave: () => engine.startNextWave(),
      setSpeed: (s) => { engine.setSpeed(s); useHudStore.getState().setSpeed(s); },
      pause: () => { engine.pause(); useHudStore.getState().setPaused(true); },
      resume: () => { engine.resume(); useHudStore.getState().setPaused(false); },
      isPaused: () => w.status === 'paused',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pause on background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const eng = engineRef.current; if (!eng) return;
      if (state !== 'active') eng.pause();
    });
    return () => sub.remove();
  }, []);

  // Stop the engine on unmount.
  useEffect(() => () => { engineRef.current?.stop(); }, []);

  return session;
}
