import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { create } from 'zustand';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector } from 'react-native-gesture-handler';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigationAction } from '@react-navigation/native';
import type { RootStackParamList } from '@/app/RootNav';
import { SkiaWorld } from '@/render/SkiaWorld';
import { useGameSession } from '@/render/useGameSession';
import { useWorldGestures, type TapResult } from '@/render/useWorldGestures';
import { useCamera } from '@/render/useCamera';
import { CHAPTER_BY_INDEX } from '@/content/chapters';
import { LEVEL_BY_ID } from '@/content/levels';
import { HUDTop, NextWaveBanner } from '@/ui/components/HUDTop';
import { TowerPanel } from '@/ui/components/TowerPanel';
import { TowerPicker } from '@/ui/components/TowerPicker';
import { PauseModal, type PauseModalMode } from '@/ui/modals/PauseModal';
import { NextWaveModal } from '@/ui/modals/NextWaveModal';
import { TutorialOverlay } from '@/ui/components/TutorialOverlay';
import { FinalWaveOverlay } from '@/ui/components/FinalWaveOverlay';
import { useHudStore } from '@/ui/hudStore';
import { useSave } from '@/app/providers/SaveProvider';
import { useAudio } from '@/app/providers/AudioProvider';
import type { TowerKind } from '@/content/types';
import type { GridCoord } from '@/lib/types';
import type { Viewport } from '@/engine/Viewport';
import { shardRewardForMatch } from '@/meta/playerLevel';
import { COLORS, RADIUS, SPACING, TEXT } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Play'>;

type PickerAnchor = { x: number; y: number; tile: number };
type PlacementState = {
  cell: GridCoord | null;
  anchor: PickerAnchor | null;
  set: (cell: GridCoord, anchor: PickerAnchor) => void;
  clear: () => void;
};

// Picker open/close state lives outside PlayScreen so opening or closing the
// placement picker doesn't re-render PlayScreen and its non-memoized children
// (HUD, modals, etc.) — the freeze on tower-pick was driven by that cascade.
const usePlacementStore = create<PlacementState>((setS) => ({
  cell: null,
  anchor: null,
  set: (cell, anchor) => setS({ cell, anchor }),
  clear: () => setS({ cell: null, anchor: null }),
}));

export function PlayScreen({ route, navigation }: Props) {
  const { store } = useSave();
  const audio = useAudio();
  const session = useGameSession({
    levelId: route.params.levelId,
    difficulty: route.params.difficulty,
    seed: 1,
  });
  const chapterAccent = (() => {
    const lvl = LEVEL_BY_ID[route.params.levelId];
    return lvl ? CHAPTER_BY_INDEX[lvl.chapter]?.paletteAccent : undefined;
  })();
  const [pauseVisible, setPauseVisible] = useState(false);
  const [pauseMode, setPauseMode] = useState<PauseModalMode>('paused');
  const [nextWaveVisible, setNextWaveVisible] = useState(false);
  const [finalWaveVisible, setFinalWaveVisible] = useState(false);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const pendingNavAction = useRef<NavigationAction | null>(null);
  const allowExit = useRef(false);
  const pausedByAbort = useRef(false);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const camera = useCamera(viewport);

  const onViewportReady = useCallback((vp: Viewport) => setViewport(vp), []);

  useEffect(() => () => { usePlacementStore.getState().clear(); }, []);

  const onCanvasLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasSize({ w: width, h: height });
  }, []);

  const closePlacement = useCallback(() => {
    usePlacementStore.getState().clear();
    session.setBuildHint(null);
  }, [session]);

  const handleTap = useCallback((r: TapResult) => {
    if (r.type === 'buildable') {
      if (viewport) {
        const w = viewport.gridToWorld(r.cell);
        const z = camera.zoom.value;
        usePlacementStore.getState().set(r.cell, {
          x: camera.panX.value + w.x * z,
          y: camera.panY.value + w.y * z,
          tile: viewport.tileSize * z,
        });
      }
      session.setBuildHint({ col: r.cell.col, row: r.cell.row, valid: true });
      session.selectTower(null);
      return;
    }
    if (r.type === 'occupied') {
      closePlacement();
      session.selectTower(r.towerId);
      return;
    }
    closePlacement();
    session.selectTower(null);
  }, [session, closePlacement, viewport, camera]);

  const gestures = useWorldGestures({
    worldRef: session.worldRef,
    viewport,
    camera,
    onTap: handleTap,
    onCameraMoveStart: closePlacement,
  });

  const onStartWavePress = useCallback(() => {
    const wd = session.worldRef.current.waveDirector;
    const nextIdx = wd.waveIndex + 1;
    const isFinal = nextIdx === wd.totalWaves - 1;
    if (isFinal) {
      setFinalWaveVisible(true);
      return;
    }
    session.startNextWave();
  }, [session]);

  const onFinalWaveAnimDone = useCallback(() => {
    setFinalWaveVisible(false);
    session.startNextWave();
  }, [session]);

  const onPickTower = useCallback((kind: TowerKind) => {
    const cell = usePlacementStore.getState().cell;
    if (!cell || !viewport) return;
    const ok = session.placeTower(kind, cell, viewport);
    if (ok) closePlacement();
  }, [viewport, session, closePlacement]);

  // Intercept back-navigation (iOS swipe, hardware back, tab bar) and ask
  // to confirm. allowExit lets us bypass the prompt for programmatic exits
  // we trigger ourselves (pause modal flow, win/lose).
  useEffect(() => {
    return navigation.addListener('beforeRemove', (e) => {
      if (allowExit.current) return;
      e.preventDefault();
      pendingNavAction.current = e.data.action;
      // Only flip pause state if the user wasn't already paused (e.g. PauseModal
      // is open). pausedByAbort tells us whether resume() should run on cancel.
      if (!session.isPaused()) {
        session.pause();
        pausedByAbort.current = true;
      }
      setPauseMode('abort-confirm');
      setPauseVisible(true);
    });
  }, [navigation, session]);

  useEffect(() => {
    const w = session.worldRef.current;
    const offW = w.bus.on('match-won', () => {
      const lives = w.lives;
      const t = w.level.starThresholds;
      const stars: 0|1|2|3 = lives >= t.stars3 ? 3 : lives >= t.stars2 ? 2 : lives > 0 ? 1 : 0;
      // Bus listeners fire during simStep's bus.flush(), before the engine's
      // onMatchEnded hook mutates the save — so store.current() still reflects
      // the pre-update state and tells us if shards were already collected
      // for this (level, difficulty) pair on a prior clear.
      const lvlPrev = store.current().campaign[route.params.levelId];
      const alreadyAwarded = lvlPrev?.shardsAwardedFor.includes(route.params.difficulty) ?? false;
      const shards = alreadyAwarded
        ? 0
        : shardRewardForMatch({
            stars,
            chapter: w.level.chapter,
            shardRewardMult: w.difficulty.shardRewardMult,
          });
      allowExit.current = true;
      navigation.replace('Win', {
        levelId: route.params.levelId,
        difficulty: route.params.difficulty,
        stars, shards,
        totalWaves: w.waveDirector.totalWaves,
      });
    });
    const offL = w.bus.on('match-lost', ({ wavesCleared }) => {
      allowExit.current = true;
      navigation.replace('Lose', {
        levelId: route.params.levelId,
        difficulty: route.params.difficulty,
        wavesCleared,
      });
    });
    return () => { offW(); offL(); };
  }, [session, navigation, store, route.params.levelId, route.params.difficulty]);

  // Music: in-game loop only while a wave is actively running. Idle/cleared
  // states use the main-menu loop set by RootNav.
  useEffect(() => {
    const w = session.worldRef.current;
    const offStart = w.bus.on('wave-started', () => { void audio.playMusic('in-game'); });
    const offCleared = w.bus.on('wave-cleared', () => { void audio.playMusic('main-menu'); });
    return () => { offStart(); offCleared(); };
  }, [session, audio]);

  const confirmAbort = () => {
    setPauseVisible(false);
    pausedByAbort.current = false;
    allowExit.current = true;
    const action = pendingNavAction.current;
    pendingNavAction.current = null;
    // Defer navigation by a frame so the modal's native dismiss can finish
    // before PlayScreen unmounts — otherwise the native Modal can leave a
    // transparent overlay on the next screen that swallows touches.
    requestAnimationFrame(() => {
      if (action) navigation.dispatch(action);
      else navigation.navigate('Chapters');
    });
  };

  const cancelAbort = () => {
    // If the abort prompt came from a back-gesture, dismiss the modal entirely
    // and resume. If it came from inside the pause flow (user tapped ABORT in
    // the paused screen), flip back to the paused view and keep the modal open.
    pendingNavAction.current = null;
    if (pausedByAbort.current) {
      setPauseVisible(false);
      session.resume();
      pausedByAbort.current = false;
    } else {
      setPauseMode('paused');
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <HUDTop
        onPause={() => {
          session.pause();
          setPauseMode('paused');
          setPauseVisible(true);
        }}
        onSpeed={(s) => session.setSpeed(s)}
        {...(chapterAccent !== undefined ? { accent: chapterAccent } : {})}
      />
      <View style={styles.canvasWrap} onLayout={onCanvasLayout}>
        <GestureDetector gesture={gestures}>
          <View style={styles.canvas}>
            <SkiaWorld
              session={session}
              onViewportReady={onViewportReady}
              cameraTransform={camera.transform}
              {...(chapterAccent !== undefined ? { accent: chapterAccent } : {})}
            />
          </View>
        </GestureDetector>
        <View pointerEvents="box-none" style={styles.nextWaveOverlay}>
          <NextWaveBanner
            worldRef={session.worldRef}
            onShowNextWave={() => setNextWaveVisible(true)}
            {...(chapterAccent !== undefined ? { accent: chapterAccent } : {})}
          />
        </View>
        <TowerPanel
          session={session}
          viewport={viewport}
          camera={camera}
          containerWidth={canvasSize.w}
          containerHeight={canvasSize.h}
        />
        <TowerPickerHost
          containerWidth={canvasSize.w}
          containerHeight={canvasSize.h}
          onPick={onPickTower}
          onDismiss={closePlacement}
        />
        <StartWaveButton onPress={onStartWavePress} />
        <FinalWaveOverlay visible={finalWaveVisible} onComplete={onFinalWaveAnimDone} />
      </View>
      <TutorialOverlay />

      <PauseModal
        visible={pauseVisible}
        mode={pauseMode}
        onResume={() => { setPauseVisible(false); session.resume(); }}
        onRestart={() => {
          setPauseVisible(false);
          allowExit.current = true;
          navigation.replace('Play', route.params);
        }}
        onAskAbort={() => setPauseMode('abort-confirm')}
        onCancelAbort={cancelAbort}
        onConfirmAbort={confirmAbort}
      />

      <NextWavePreviewBridge
        visible={nextWaveVisible}
        worldRef={session.worldRef}
        onDismiss={() => setNextWaveVisible(false)}
      />
    </SafeAreaView>
  );
}

function TowerPickerHost({
  containerWidth, containerHeight, onPick, onDismiss,
}: {
  containerWidth: number;
  containerHeight: number;
  onPick: (k: TowerKind) => void;
  onDismiss: () => void;
}) {
  const cell = usePlacementStore((s) => s.cell);
  const anchor = usePlacementStore((s) => s.anchor);
  return (
    <TowerPicker
      visible={cell !== null}
      anchor={anchor}
      containerWidth={containerWidth}
      containerHeight={containerHeight}
      onPick={onPick}
      onDismiss={onDismiss}
    />
  );
}

function NextWavePreviewBridge({
  visible, worldRef, onDismiss,
}: {
  visible: boolean;
  worldRef: { current: import('@/world/World').World };
  onDismiss: () => void;
}) {
  const waveIndex = useHudStore((s) => s.waveIndex);
  const wave = worldRef.current.level.waves[waveIndex + 1] ?? null;
  return (
    <NextWaveModal
      visible={visible}
      wave={wave}
      waveNumber={waveIndex + 2}
      onDismiss={onDismiss}
    />
  );
}

function StartWaveButton({ onPress }: { onPress: () => void }) {
  const status = useHudStore((s) => s.waveStatus);
  if (status !== 'idle' && status !== 'cleared') return null;
  return (
    <View pointerEvents="box-none" style={styles.startWrap}>
      <Pressable onPress={onPress} style={styles.startBtn} accessibilityLabel="Start next wave">
        <Text style={styles.startText}>START</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  canvasWrap: { flex: 1, position: 'relative' },
  canvas: { flex: 1 },
  nextWaveOverlay: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.md,
    right: SPACING.md,
  },
  startWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SPACING.xl,
    alignItems: 'center',
  },
  startBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.tertiary,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.tertiary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  startText: { ...TEXT.button, color: COLORS.textOnAccent, fontSize: 16, letterSpacing: 1 },
});
