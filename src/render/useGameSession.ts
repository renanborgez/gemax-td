import { useEffect, useMemo, useRef } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { AppState } from 'react-native';
import { Engine, type Clock } from '@/engine/Engine';
import { createWorld, type World, type RedrawPort } from '@/world/World';
import {
  EMPTY_SNAPSHOT, buildSnapshot, rangeFromSelection,
  type WorldSnapshot, type RangeSnap, type BuildHintSnap,
} from '@/render/snapshot';
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
  snapshot: SharedValue<WorldSnapshot>;
  /** Event-driven: selection range circle. Updated on selectTower / refreshRange. */
  range: SharedValue<RangeSnap>;
  /** Event-driven: placement hint cell. Updated by gesture / placement code. */
  buildHint: SharedValue<BuildHintSnap>;
  /** UI commands. */
  startNextWave(): void;
  setSpeed(s: 1 | 2 | 3): void;
  pause(): void;
  resume(): void;
  isPaused(): boolean;
  /** Set selection. Pass null to clear. Updates world.selection, range SharedValue, hudStore. */
  selectTower(towerId: string | null): void;
  /** Re-read selected tower's range into the SharedValue (e.g. after upgrade). */
  refreshRange(): void;
};

export function useGameSession(opts: { levelId: string; difficulty: Difficulty; seed: number }): GameSession {
  const { data, store, refresh } = useSave();
  const audio = useAudio();
  const snapshot = useSharedValue<WorldSnapshot>(EMPTY_SNAPSHOT);
  const range = useSharedValue<RangeSnap>(null);
  const buildHint = useSharedValue<BuildHintSnap>(null);
  const worldRef = useRef<World | null>(null);
  const engineRef = useRef<Engine | null>(null);

  // Build world once per match.
  if (!worldRef.current) {
    const level = LEVEL_BY_ID[opts.levelId];
    if (!level) throw new Error(`unknown level ${opts.levelId}`);
    const effects = buildEffectsContext(TECH_NODES, data);
    const redraw: RedrawPort = {
      bump: () => {
        const w = worldRef.current;
        if (!w) return;
        snapshot.value = buildSnapshot(w);
        // Selected-tower position can drift (no movement today, but cheap and
        // future-proof). Only re-emit range if selection still alive.
        if (w.selection.tower) {
          const t = w.selection.tower;
          if (t.alive) {
            const cur = range.value;
            if (!cur || cur.x !== t.x || cur.y !== t.y || cur.r !== t.base.range) {
              range.value = { x: t.x, y: t.y, r: t.base.range };
            }
          }
        }
      },
    };
    worldRef.current = createWorld({
      level, difficulty: opts.difficulty, seed: opts.seed, effects, redraw,
    });
    if (__DEV__) {
      worldRef.current.credits = 200000;
    }
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

    // Wire SFX cues. Coalesce enemy-death so a single AoE blast doesn't fan
    // out into N synchronous native audio calls in one bus.flush().
    let lastDeathSfxAt = 0;
    w.bus.on('enemy-died', () => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - lastDeathSfxAt < 60) return;
      lastDeathSfxAt = now;
      audio.playSfx('enemy-death');
    });
    w.bus.on('life-lost', () => audio.playSfx('life-lost'));
    w.bus.on('wave-started', () => audio.playSfx('wave-start'));
    w.bus.on('tower-placed', () => audio.playSfx('tower-placed'));

    engine.start();

    const selectTower = (towerId: string | null) => {
      if (towerId === null) {
        w.selection = {};
        range.value = null;
        useHudStore.getState().setSelectedTowerId(null);
        return;
      }
      const tower = w.entities.towers.find((x) => x.id === towerId && x.alive);
      if (!tower) {
        w.selection = {};
        range.value = null;
        useHudStore.getState().setSelectedTowerId(null);
        return;
      }
      w.selection = { towerId, tower };
      range.value = { x: tower.x, y: tower.y, r: tower.base.range };
      useHudStore.getState().setSelectedTowerId(towerId);
    };

    const refreshRange = () => {
      range.value = rangeFromSelection(w);
    };

    return {
      worldRef: worldRef as { current: World },
      snapshot,
      range,
      buildHint,
      startNextWave: () => {
        const idx = w.waveDirector.waveIndex + 1;
        const next = w.level.waves[idx];
        if (!next) return;
        // Bonus = full delayBeforeStart × 5 (true elapsed-countdown is deferred).
        const bonus = Math.floor(next.delayBeforeStart * 5);
        if (bonus > 0) {
          w.credits += bonus;
          w.bus.emit('credits-changed', { credits: w.credits });
        }
        engine.startNextWave();
      },
      setSpeed: (s) => { engine.setSpeed(s); useHudStore.getState().setSpeed(s); },
      pause: () => { engine.pause(); useHudStore.getState().setPaused(true); },
      resume: () => { engine.resume(); useHudStore.getState().setPaused(false); },
      isPaused: () => w.status === 'paused',
      selectTower,
      refreshRange,
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
