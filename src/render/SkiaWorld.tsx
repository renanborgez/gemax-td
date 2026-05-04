import React, { useMemo, useState } from 'react';
import { Canvas, Group } from '@shopify/react-native-skia';
import { type LayoutChangeEvent, View, StyleSheet, PixelRatio } from 'react-native';
import { Viewport } from '@/engine/Viewport';
import { BackgroundLayer } from '@/render/layers/BackgroundLayer';
import { PathLayer } from '@/render/layers/PathLayer';
import { GridOverlayLayer } from '@/render/layers/GridOverlayLayer';
import { TowersLayer } from '@/render/layers/TowersLayer';
import { EnemiesLayer } from '@/render/layers/EnemiesLayer';
import { ProjectilesLayer } from '@/render/layers/ProjectilesLayer';
import { FXLayer } from '@/render/layers/FXLayer';
import { RangeIndicatorLayer } from '@/render/layers/RangeIndicatorLayer';
import type { GameSession } from '@/render/useGameSession';
import { COLORS } from '@/render/theme';

export function SkiaWorld({
  session,
  onViewportReady,
}: {
  session: GameSession;
  onViewportReady?: (vp: Viewport) => void;
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
    const vp = new Viewport({
      canvasWidthPx: size.w,
      canvasHeightPx: size.h,
      gridCols: world.level.grid.cols,
      gridRows: world.level.grid.rows,
      canvasOriginScreen: { x: size.x, y: size.y },
      dpr: PixelRatio.get(),
    });
    onViewportReady?.(vp);
    return vp;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size?.w, size?.h, size?.x, size?.y]);

  return (
    <View style={styles.root} onLayout={onLayout}>
      {viewport && (
        <Canvas style={StyleSheet.absoluteFillObject}>
          <Group>
            <BackgroundLayer viewport={viewport} />
            <PathLayer world={world} viewport={viewport} />
            <GridOverlayLayer world={world} viewport={viewport} redrawTick={session.redrawTick} />
            <TowersLayer world={world} viewport={viewport} redrawTick={session.redrawTick} />
            <EnemiesLayer world={world} viewport={viewport} redrawTick={session.redrawTick} />
            <ProjectilesLayer world={world} viewport={viewport} redrawTick={session.redrawTick} />
            <FXLayer world={world} viewport={viewport} redrawTick={session.redrawTick} />
            <RangeIndicatorLayer world={world} viewport={viewport} redrawTick={session.redrawTick} />
          </Group>
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
});
