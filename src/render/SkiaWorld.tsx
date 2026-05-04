import React, { useMemo, useState } from 'react';
import { Canvas, Group } from '@shopify/react-native-skia';
import { type LayoutChangeEvent, View, StyleSheet, PixelRatio } from 'react-native';
import { Viewport } from '@/engine/Viewport';
import { BackgroundLayer } from '@/render/layers/BackgroundLayer';
import { PathLayer } from '@/render/layers/PathLayer';
import { GridOverlayLayer } from '@/render/layers/GridOverlayLayer';
import { BuildableLayer } from '@/render/layers/BuildableLayer';
import { TowersLayer } from '@/render/layers/TowersLayer';
import { EnemiesLayer } from '@/render/layers/EnemiesLayer';
import { ProjectilesLayer } from '@/render/layers/ProjectilesLayer';
import { FXLayer } from '@/render/layers/FXLayer';
import { RangeIndicatorLayer } from '@/render/layers/RangeIndicatorLayer';
import type { GameSession } from '@/render/useGameSession';
import { COLORS } from '@/render/theme';
import type { TowerKind } from '@/content/types';

export function SkiaWorld({
  session,
  onViewportReady,
  buyKind = null,
}: {
  session: GameSession;
  onViewportReady?: (vp: Viewport) => void;
  buyKind?: TowerKind | null;
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
            <BuildableLayer viewport={viewport} snapshot={session.snapshot} buyKind={buyKind} />
            <GridOverlayLayer viewport={viewport} snapshot={session.snapshot} />
            <TowersLayer viewport={viewport} snapshot={session.snapshot} />
            <EnemiesLayer viewport={viewport} snapshot={session.snapshot} />
            <ProjectilesLayer viewport={viewport} snapshot={session.snapshot} />
            <FXLayer />
            <RangeIndicatorLayer viewport={viewport} snapshot={session.snapshot} />
          </Group>
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
});
