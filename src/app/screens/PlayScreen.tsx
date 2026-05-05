import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector } from 'react-native-gesture-handler';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigationAction } from '@react-navigation/native';
import type { RootStackParamList } from '@/app/RootNav';
import { SkiaWorld } from '@/render/SkiaWorld';
import { useGameSession } from '@/render/useGameSession';
import { useWorldGestures } from '@/render/useWorldGestures';
import { useCamera } from '@/render/useCamera';
import { HUDTop } from '@/ui/components/HUDTop';
import { HUDBottom } from '@/ui/components/HUDBottom';
import { TowerPanel } from '@/ui/components/TowerPanel';
import { WavePreview } from '@/ui/components/WavePreview';
import { PauseModal } from '@/ui/modals/PauseModal';
import { AbortMissionModal } from '@/ui/modals/AbortMissionModal';
import { TutorialOverlay } from '@/ui/components/TutorialOverlay';
import type { TowerKind } from '@/content/types';
import type { Viewport } from '@/engine/Viewport';
import { COLORS } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Play'>;

export function PlayScreen({ route, navigation }: Props) {
  const session = useGameSession({
    levelId: route.params.levelId,
    difficulty: route.params.difficulty,
    seed: 1,
  });
  const [buyKind, setBuyKind] = useState<TowerKind | null>(null);
  const [pauseVisible, setPauseVisible] = useState(false);
  const [abortVisible, setAbortVisible] = useState(false);
  const pendingNavAction = useRef<NavigationAction | null>(null);
  const allowExit = useRef(false);
  const pausedByAbort = useRef(false);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const camera = useCamera(viewport);

  const onViewportReady = useCallback((vp: Viewport) => setViewport(vp), []);

  const gestures = useWorldGestures({
    worldRef: session.worldRef,
    viewport,
    camera,
    getBuyKind: () => buyKind,
    setBuyKind,
    selectTower: session.selectTower,
  });

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
      const shards = Math.round(stars * 10 * w.difficulty.shardRewardMult * (1 + 0.05 * w.level.chapter));
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
  }, [session, navigation, route.params.levelId, route.params.difficulty]);

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
        onPause={() => { session.pause(); setPauseVisible(true); }}
        onSpeed={(s) => session.setSpeed(s)}
        onSendNextWave={() => session.startNextWave()}
        onExit={requestAbort}
      />
      <View style={styles.canvasWrap}>
        <GestureDetector gesture={gestures}>
          <View style={styles.canvas}>
            <SkiaWorld
              session={session}
              onViewportReady={onViewportReady}
              buyKind={buyKind}
              cameraTransform={camera.transform}
            />
          </View>
        </GestureDetector>
        <TowerPanel session={session} />
        <WavePreview worldRef={session.worldRef} />
      </View>
      <HUDBottom selected={buyKind} onSelect={setBuyKind} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  canvasWrap: { flex: 1, position: 'relative' },
  canvas: { flex: 1 },
});
