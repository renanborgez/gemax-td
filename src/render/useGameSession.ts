import { useEffect, useMemo, useRef } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { AppState } from 'react-native';
import { Engine, type Clock } from '@/engine/Engine';
import { createWorld, type World, type RedrawPort } from '@/world/World';
import {
  EMPTY_SNAPSHOT, buildSnapshot, rangeFromSelection,
  type WorldSnapshot, type RangeSnap, type BuildHintSnap,
} from '@/render/snapshot';
import { LEVEL_BY_ID } from '@/content/levels';
import { attachEventBridge } from '@/ui/eventBridge';
import { useHudStore } from '@/ui/hudStore';
import { useSave } from '@/app/providers/SaveProvider';
import { useAudio } from '@/app/providers/AudioProvider';
import type { Difficulty, TowerKind } from '@/content/types';
import type { GridCoord } from '@/lib/types';
import type { Viewport } from '@/engine/Viewport';
import { getTowerDef } from '@/entities/registry';
import { levelFromXp, xpRewardForMatch, shardRewardForMatch } from '@/meta/playerLevel';
import { buildEffectsContext } from '@/meta/TechTree';

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
  /**
   * Place `kind` on `cell`. Returns `true` if placement succeeded; `false` if
   * the cell is no longer buildable or credits are insufficient (UI gates
   * upfront, but the world can drift between picker open and tap).
   */
  placeTower(kind: TowerKind, cell: GridCoord, viewport: Viewport): boolean;
  /** Update the hint cell that GridOverlayLayer renders. Pass null to clear. */
  setBuildHint(hint: { col: number; row: number; valid: boolean } | null): void;
};

export function useGameSession(opts: { levelId: string; difficulty: Difficulty; seed: number }): GameSession {
  const { store, refresh } = useSave();
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
    const effects = buildEffectsContext(store.current().meta.techTree);
    let prevEnemyCount = 0;
    let prevProjectileCount = 0;
    const redraw: RedrawPort = {
      bump: () => {
        const w = worldRef.current;
        if (!w) return;
        // Idle-skip: when both enemy and projectile lists are empty AND were
        // empty last frame, don't reassign the SharedValue. This avoids waking
        // every layer's useDerivedValue worklet during pre-wave / post-wave
        // idle. The cleanupSystem compacts both arrays at the end of every
        // simStep, so `length` already equals the alive count here.
        const enemyCount = w.entities.enemies.length;
        const projCount = w.entities.projectiles.length;
        const changed = enemyCount > 0 || projCount > 0
          || prevEnemyCount > 0 || prevProjectileCount > 0;
        prevEnemyCount = enemyCount;
        prevProjectileCount = projCount;
        if (changed) snapshot.value = buildSnapshot(w);
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
          // Selector × global tech tree mults stack multiplicatively for both
          // shard and XP rewards.
          const xpGained = xpRewardForMatch({
            wavesCleared: world.waveDirector.totalWaves,
            stars,
            chapter: world.level.chapter,
            xpRewardMult: world.difficulty.xpRewardMult * world.effects.globals.xpRewardMult,
          });
          store.update((d) => {
            const lvl = (d.campaign[world.level.id] ??= {
              bestStarsByDifficulty: {}, bestWaveReached: 0, cleared: false, shardsAwardedFor: [],
            });
            const prev = lvl.bestStarsByDifficulty[opts.difficulty] ?? 0;
            if (stars > prev) lvl.bestStarsByDifficulty[opts.difficulty] = stars;
            lvl.cleared = true;
            lvl.bestWaveReached = world.waveDirector.totalWaves;
            if (!lvl.shardsAwardedFor.includes(opts.difficulty)) {
              const award = shardRewardForMatch({
                stars,
                chapter: world.level.chapter,
                shardRewardMult: world.difficulty.shardRewardMult * world.effects.globals.shardRewardMult,
              });
              d.meta.shards += award;
              lvl.shardsAwardedFor.push(opts.difficulty);
            }
            d.meta.playerXp += xpGained;
            d.meta.playerLevel = levelFromXp(d.meta.playerXp);
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
    // Defer placement SFX off the simStep tick — the same bus.flush that fires
    // this listener also bumps TowersLayer, which mounts a new Skia subtree.
    // Letting the audio call share that frame causes a visible micro-stall.
    w.bus.on('tower-placed', () => {
      setTimeout(() => audio.playSfx('tower-placed'), 0);
    });

    // Per-tower fire SFX. Coalesce rapid same-kind shots so a wave of fire
    // intents in a single tick doesn't fan out into N synchronous audio calls.
    const lastFireAt = new Map<string, number>();
    w.bus.on('tower-fired', ({ kind }) => {
      const sfxKey = `tower-fire-${kind}` as const;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const prev = lastFireAt.get(kind) ?? 0;
      if (now - prev < 30) return;
      lastFireAt.set(kind, now);
      audio.playSfx(sfxKey as Parameters<typeof audio.playSfx>[0]);
    });

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

    const placeTower = (kind: TowerKind, cell: GridCoord, viewport: Viewport): boolean => {
      const def = getTowerDef(kind);
      if (!w.grid.canBuild(cell) || w.credits < def.cost) return false;
      w.credits -= def.cost;
      const center = viewport.gridToWorld(cell);
      const id = w.idGen('tower');
      const tower = new def.classRef({
        id, defKind: def.kind, level: 1,
        x: center.x / viewport.tileSize, y: center.y / viewport.tileSize,
        tileCoord: cell,
        baseStats: { ...def.baseStats },
        projectileKind: def.projectileKind,
        targets: def.targets,
        defaultTargetPriority: def.defaultTargetPriority,
      });
      w.grid.occupy(cell, id);
      w.entities.towers.push(tower);
      w.bus.emit('tower-placed', { towerId: id, kind: def.kind });
      w.bus.emit('credits-changed', { credits: w.credits });
      return true;
    };

    const setBuildHint = (hint: { col: number; row: number; valid: boolean } | null) => {
      buildHint.value = hint;
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
      placeTower,
      setBuildHint,
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
