import React, { useEffect, useMemo, useState } from 'react';
import { Canvas, Group } from '@shopify/react-native-skia';
import { type LayoutChangeEvent, View, StyleSheet, PixelRatio } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { Viewport } from '@/engine/Viewport';
import { BackgroundLayer } from '@/render/layers/BackgroundLayer';
import { PathLayer } from '@/render/layers/PathLayer';
import { GridOverlayLayer } from '@/render/layers/GridOverlayLayer';
import { BaseLayer } from '@/render/layers/BaseLayer';
import { SpawnLayer } from '@/render/layers/SpawnLayer';
import { TowersLayer } from '@/render/layers/TowersLayer';
import { EnemiesLayer } from '@/render/layers/EnemiesLayer';
import { ProjectilesLayer } from '@/render/layers/ProjectilesLayer';
import { FXLayer } from '@/render/layers/FXLayer';
import { RangeIndicatorLayer } from '@/render/layers/RangeIndicatorLayer';
import type { GameSession } from '@/render/useGameSession';
import type { CameraTransform } from '@/render/useCamera';
import { COLORS } from '@/render/theme';

export function SkiaWorld({
  session,
  onViewportReady,
  cameraTransform,
}: {
  session: GameSession;
  onViewportReady?: (vp: Viewport) => void;
  cameraTransform: SharedValue<CameraTransform>;
}) {
  const world = session.worldRef.current;
  const [size, setSize] = useState<{ w: number; h: number; x: number; y: number } | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    e.target?.measure?.((_x, _y, _w, _h, pageX, pageY) => {
      setSize({ w: width, h: height, x: pageX, y: pageY });
    });
  };

  const viewport = useMemo(() => {
    if (!size) return null;
    return new Viewport({
      canvasWidthPx: size.w,
      canvasHeightPx: size.h,
      gridCols: world.level.grid.cols,
      gridRows: world.level.grid.rows,
      canvasOriginScreen: { x: size.x, y: size.y },
      dpr: PixelRatio.get(),
    });
  }, [size?.w, size?.h, size?.x, size?.y, world.level.grid.cols, world.level.grid.rows]);

  useEffect(() => {
    if (viewport) onViewportReady?.(viewport);
  }, [viewport, onViewportReady]);

  return (
    <View style={styles.root} onLayout={onLayout}>
      {viewport && (
        <Canvas style={StyleSheet.absoluteFillObject}>
          <BackgroundLayer viewport={viewport} />
          <Group transform={cameraTransform}>
            <PathLayer world={world} viewport={viewport} />
            <GridOverlayLayer viewport={viewport} grid={world.grid} buildHint={session.buildHint} />
            <BaseLayer world={world} viewport={viewport} />
            <SpawnLayer world={world} viewport={viewport} />
            <TowersLayer viewport={viewport} worldRef={session.worldRef} />
            <EnemiesLayer viewport={viewport} snapshot={session.snapshot} />
            <ProjectilesLayer viewport={viewport} snapshot={session.snapshot} />
            <FXLayer />
            <RangeIndicatorLayer viewport={viewport} range={session.range} />
          </Group>
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
});
