import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector } from 'react-native-gesture-handler';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { SkiaWorld } from '@/render/SkiaWorld';
import { useGameSession } from '@/render/useGameSession';
import { useWorldGestures } from '@/render/useWorldGestures';
import { HUDTop } from '@/ui/components/HUDTop';
import { HUDBottom } from '@/ui/components/HUDBottom';
import { TowerPanel } from '@/ui/components/TowerPanel';
import { WavePreview } from '@/ui/components/WavePreview';
import { PauseModal } from '@/ui/modals/PauseModal';
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
  const viewportRef = useRef<Viewport | null>(null);

  const gestures = useWorldGestures({
    worldRef: session.worldRef,
    getViewport: () => viewportRef.current,
    getBuyKind: () => buyKind,
    setBuyKind,
  });

  useEffect(() => {
    const w = session.worldRef.current;
    const offW = w.bus.on('match-won', () => {
      const lives = w.lives;
      const t = w.level.starThresholds;
      const stars: 0|1|2|3 = lives >= t.stars3 ? 3 : lives >= t.stars2 ? 2 : lives > 0 ? 1 : 0;
      const shards = Math.round(stars * 10 * w.difficulty.shardRewardMult * (1 + 0.05 * w.level.chapter));
      navigation.replace('Win', {
        levelId: route.params.levelId,
        difficulty: route.params.difficulty,
        stars, shards,
        totalWaves: w.waveDirector.totalWaves,
      });
    });
    const offL = w.bus.on('match-lost', ({ wavesCleared }) => {
      navigation.replace('Lose', {
        levelId: route.params.levelId,
        difficulty: route.params.difficulty,
        wavesCleared,
      });
    });
    return () => { offW(); offL(); };
  }, [session, navigation, route.params.levelId, route.params.difficulty]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <HUDTop
        onPause={() => { session.pause(); setPauseVisible(true); }}
        onSpeed={(s) => session.setSpeed(s)}
        onSendNextWave={() => session.startNextWave()}
      />
      <View style={styles.canvasWrap}>
        <GestureDetector gesture={gestures}>
          <View style={styles.canvas}>
            <SkiaWorld session={session} onViewportReady={(vp) => { viewportRef.current = vp; }} buyKind={buyKind} />
          </View>
        </GestureDetector>
        <TowerPanel worldRef={session.worldRef} />
        <WavePreview worldRef={session.worldRef} />
      </View>
      <HUDBottom selected={buyKind} onSelect={setBuyKind} />
      <TutorialOverlay />

      <PauseModal
        visible={pauseVisible}
        onResume={() => { setPauseVisible(false); session.resume(); }}
        onRestart={() => navigation.replace('Play', route.params)}
        onExit={() => { setPauseVisible(false); navigation.popToTop(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  canvasWrap: { flex: 1, position: 'relative' },
  canvas: { flex: 1 },
});
