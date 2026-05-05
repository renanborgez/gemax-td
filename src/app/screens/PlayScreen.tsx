import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector } from 'react-native-gesture-handler';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigationAction } from '@react-navigation/native';
import type { RootStackParamList } from '@/app/RootNav';
import { SkiaWorld } from '@/render/SkiaWorld';
import { useGameSession } from '@/render/useGameSession';
import { useWorldGestures, type TapResult } from '@/render/useWorldGestures';
import { useCamera } from '@/render/useCamera';
import { HUDTop } from '@/ui/components/HUDTop';
import { TowerPanel } from '@/ui/components/TowerPanel';
import { TowerPicker } from '@/ui/components/TowerPicker';
import { PauseModal } from '@/ui/modals/PauseModal';
import { NextWaveModal } from '@/ui/modals/NextWaveModal';
import { AbortMissionModal } from '@/ui/modals/AbortMissionModal';
import { TutorialOverlay } from '@/ui/components/TutorialOverlay';
import { useHudStore } from '@/ui/hudStore';
import { useSave } from '@/app/providers/SaveProvider';
import type { TowerKind } from '@/content/types';
import type { GridCoord } from '@/lib/types';
import type { Viewport } from '@/engine/Viewport';
import { COLORS, RADIUS, SPACING, TEXT } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Play'>;

export function PlayScreen({ route, navigation }: Props) {
  const { store } = useSave();
  const session = useGameSession({
    levelId: route.params.levelId,
    difficulty: route.params.difficulty,
    seed: 1,
  });
  const [pauseVisible, setPauseVisible] = useState(false);
  const [abortVisible, setAbortVisible] = useState(false);
  const [nextWaveVisible, setNextWaveVisible] = useState(false);
  const [placementCell, setPlacementCell] = useState<GridCoord | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<{ x: number; y: number; tile: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const pendingNavAction = useRef<NavigationAction | null>(null);
  const allowExit = useRef(false);
  const pausedByAbort = useRef(false);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const camera = useCamera(viewport);

  const onViewportReady = useCallback((vp: Viewport) => setViewport(vp), []);

  const onCanvasLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasSize({ w: width, h: height });
  }, []);

  const closePlacement = useCallback(() => {
    setPlacementCell(null);
    setPickerAnchor(null);
    session.setBuildHint(null);
  }, [session]);

  const handleTap = useCallback((r: TapResult) => {
    if (r.type === 'buildable') {
      setPlacementCell(r.cell);
      if (viewport) {
        const w = viewport.gridToWorld(r.cell);
        const z = camera.zoom.value;
        setPickerAnchor({
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

  const onPickTower = useCallback((kind: TowerKind) => {
    if (!placementCell || !viewport) return;
    const ok = session.placeTower(kind, placementCell, viewport);
    if (ok) closePlacement();
  }, [placementCell, viewport, session, closePlacement]);

  // Intercept back-navigation (iOS swipe, hardware back, tab bar) and ask
  // to confirm. allowExit lets us bypass the prompt for programmatic exits
  // we trigger ourselves (pause modal "Exit", win/lose, abort confirm).
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
      setAbortVisible(true);
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
        : Math.round(stars * 10 * w.difficulty.shardRewardMult * (1 + 0.05 * w.level.chapter));
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

  const confirmAbort = () => {
    setAbortVisible(false);
    pausedByAbort.current = false;
    allowExit.current = true;
    const action = pendingNavAction.current;
    pendingNavAction.current = null;
    // Replay the pending action (swipe/back/tab tap) now that we've allowed it.
    // Fall back to LevelSelect if no captured action (e.g. abort triggered from UI).
    if (action) navigation.dispatch(action);
    else navigation.navigate('LevelSelect');
  };

  const cancelAbort = () => {
    setAbortVisible(false);
    pendingNavAction.current = null;
    if (pausedByAbort.current) {
      session.resume();
      pausedByAbort.current = false;
    }
  };

  const requestAbort = () => {
    if (!session.isPaused()) {
      session.pause();
      pausedByAbort.current = true;
    }
    setAbortVisible(true);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <HUDTop
        worldRef={session.worldRef}
        onPause={() => { session.pause(); setPauseVisible(true); }}
        onSpeed={(s) => session.setSpeed(s)}
        onExit={requestAbort}
        onShowNextWave={() => setNextWaveVisible(true)}
      />
      <View style={styles.canvasWrap} onLayout={onCanvasLayout}>
        <GestureDetector gesture={gestures}>
          <View style={styles.canvas}>
            <SkiaWorld
              session={session}
              onViewportReady={onViewportReady}
              cameraTransform={camera.transform}
            />
          </View>
        </GestureDetector>
        <TowerPanel session={session} />
        <TowerPicker
          visible={placementCell !== null}
          anchor={pickerAnchor}
          containerWidth={canvasSize.w}
          containerHeight={canvasSize.h}
          onPick={onPickTower}
          onDismiss={closePlacement}
        />
        <StartWaveButton onPress={() => session.startNextWave()} />
      </View>
      <TutorialOverlay />

      <PauseModal
        visible={pauseVisible}
        onResume={() => { setPauseVisible(false); session.resume(); }}
        onRestart={() => {
          setPauseVisible(false);
          allowExit.current = true;
          navigation.replace('Play', route.params);
        }}
        onExit={() => {
          setPauseVisible(false);
          allowExit.current = true;
          navigation.navigate('LevelSelect');
        }}
      />

      <AbortMissionModal
        visible={abortVisible}
        onCancel={cancelAbort}
        onConfirm={confirmAbort}
      />

      <NextWavePreviewBridge
        visible={nextWaveVisible}
        worldRef={session.worldRef}
        onDismiss={() => setNextWaveVisible(false)}
      />
    </SafeAreaView>
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
    minWidth: 140,
    alignItems: 'center',
    shadowColor: COLORS.tertiary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  startText: { ...TEXT.button, color: COLORS.textOnAccent, fontSize: 16, letterSpacing: 1 },
});
