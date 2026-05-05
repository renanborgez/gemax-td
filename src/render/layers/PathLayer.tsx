import React, { useMemo } from 'react';
import { Path as SkPath, Skia } from '@shopify/react-native-skia';
import type { World } from '@/world/World';
import type { Viewport } from '@/engine/Viewport';
import { COLORS } from '@/render/theme';

export function PathLayer({ world, viewport }: { world: World; viewport: Viewport }) {
  const pts = world.level.path;

  const path = useMemo(() => {
    const p = Skia.Path.Make();
    if (pts.length < 2) return p;
    const first = viewport.gridToWorld(pts[0]!);
    p.moveTo(first.x, first.y);
    for (let i = 1; i < pts.length; i++) {
      const xy = viewport.gridToWorld(pts[i]!);
      p.lineTo(xy.x, xy.y);
    }
    return p;
  }, [pts, viewport]);

  return (
    <SkPath
      path={path}
      style="stroke"
      strokeWidth={1.5}
      color={COLORS.cyan}
      strokeCap="round"
      strokeJoin="round"
    />
  );
}
