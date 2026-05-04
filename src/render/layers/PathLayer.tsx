import React, { useMemo } from 'react';
import { Path as SkPath, Skia, BlurMask } from '@shopify/react-native-skia';
import type { World } from '@/world/World';
import type { Viewport } from '@/engine/Viewport';
import { COLORS } from '@/render/theme';

export function PathLayer({ world, viewport }: { world: World; viewport: Viewport }) {
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    const pts = world.level.path;
    if (pts.length < 2) return p;
    const first = viewport.gridToWorld(pts[0]!);
    p.moveTo(first.x, first.y);
    for (let i = 1; i < pts.length; i++) {
      const xy = viewport.gridToWorld(pts[i]!);
      p.lineTo(xy.x, xy.y);
    }
    return p;
  }, [world.level.path, viewport]);

  return (
    <>
      <SkPath path={path} style="stroke" strokeWidth={viewport.tileSize * 0.7} color={COLORS.pathGlow} opacity={0.18} strokeCap="round" strokeJoin="round" />
      <SkPath path={path} style="stroke" strokeWidth={viewport.tileSize * 0.4} color={COLORS.pathGlow} opacity={0.6} strokeCap="round" strokeJoin="round">
        <BlurMask blur={6} style="solid" />
      </SkPath>
      <SkPath path={path} style="stroke" strokeWidth={1.5} color={COLORS.cyan} strokeCap="round" strokeJoin="round" />
    </>
  );
}
