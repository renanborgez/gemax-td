import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
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
import { WinModal } from '@/ui/modals/WinModal';
import { LoseModal } from '@/ui/modals/LoseModal';
import type { TowerKind } from '@/content/types';
import type { Viewport } from '@/engine/Viewport';

type Props = NativeStackScreenProps<RootStackParamList, 'Play'>;

export function PlayScreen({ route, navigation }: Props) {
  const session = useGameSession({
    levelId: route.params.levelId,
    difficulty: route.params.difficulty,
    seed: 1,
  });
  const [buyKind, setBuyKind] = useState<TowerKind | null>(null);
  const [pauseVisible, setPauseVisible] = useState(false);
  const [endState, setEndState] = useState<{ won: boolean; stars: 0|1|2|3; shards: number; waves: number } | null>(null);
  const viewportRef = useRef<Viewport | null>(null);

  const gestures = useWorldGestures({
    worldRef: session.worldRef,
    getViewport: () => viewportRef.current,
    getBuyKind: () => buyKind,
    setBuyKind,
  });

  // Subscribe to match-won/lost from the bus.
  useEffect(() => {
    const w = session.worldRef.current;
    const offW = w.bus.on('match-won', () => {
      const lives = w.lives;
      const t = w.level.starThresholds;
      const stars: 0|1|2|3 = lives >= t.stars3 ? 3 : lives >= t.stars2 ? 2 : lives > 0 ? 1 : 0;
      const shards = Math.round(stars * 10 * w.difficulty.shardRewardMult * (1 + 0.05 * w.level.chapter));
      setEndState({ won: true, stars, shards, waves: w.waveDirector.totalWaves });
    });
    const offL = w.bus.on('match-lost', ({ wavesCleared }) => {
      setEndState({ won: false, stars: 0, shards: 0, waves: wavesCleared });
    });
    return () => { offW(); offL(); };
  }, [session]);

  return (
    <View style={styles.root}>
      <HUDTop
        onPause={() => { session.pause(); setPauseVisible(true); }}
        onSpeed={(s) => session.setSpeed(s)}
        onSendNextWave={() => session.startNextWave()}
      />
      <GestureDetector gesture={gestures}>
        <View style={styles.canvas}>
          <SkiaWorld session={session} onViewportReady={(vp) => { viewportRef.current = vp; }} />
        </View>
      </GestureDetector>
      <HUDBottom selected={buyKind} onSelect={setBuyKind} />
      <TowerPanel worldRef={session.worldRef} />
      <WavePreview worldRef={session.worldRef} />

      <PauseModal
        visible={pauseVisible}
        onResume={() => { setPauseVisible(false); session.resume(); }}
        onRestart={() => navigation.replace('Play', route.params)}
        onExit={() => { setPauseVisible(false); navigation.popToTop(); }}
      />
      <WinModal
        visible={endState?.won === true}
        stars={endState?.stars ?? 0}
        shards={endState?.shards ?? 0}
        onContinue={() => navigation.popToTop()}
      />
      <LoseModal
        visible={endState?.won === false}
        wavesCleared={endState?.waves ?? 0}
        onRetry={() => { setEndState(null); navigation.replace('Play', route.params); }}
        onExit={() => { setEndState(null); navigation.popToTop(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0E1A' },
  canvas: { flex: 1 },
});
