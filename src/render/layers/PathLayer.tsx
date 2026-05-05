import React, { useMemo } from 'react';
import { Path as SkPath, Skia } from '@shopify/react-native-skia';
import type { World } from '@/world/World';
import type { Viewport } from '@/engine/Viewport';
import { COLORS } from '@/render/theme';

export function PathLayer({
  world,
  viewport,
  accent,
}: {
  world: World;
  viewport: Viewport;
  /** Chapter accent — when set, tints the path stroke. Falls back to the
   *  default cyan-soft used on chapter-less / debug levels. */
  accent?: string;
}) {
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

  // Soft tint matches the original primarySoft (~12% alpha) but in the
  // chapter accent so the path reads as part of the chapter palette.
  const color = accent ? `${accent}33` : COLORS.primarySoft;

  return (
    <SkPath
      path={path}
      style="stroke"
      strokeWidth={1}
      color={color}
      strokeCap="round"
      strokeJoin="round"
    />
  );
}
