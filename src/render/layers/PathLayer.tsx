import React, { useMemo } from 'react';
import { LinearGradient, Path as SkPath, Skia, vec } from '@shopify/react-native-skia';
import type { World } from '@/world/World';
import type { Viewport } from '@/engine/Viewport';
import { COLORS } from '@/render/theme';

export function PathLayer({
  world,
  viewport,
  accent,
  secondary,
}: {
  world: World;
  viewport: Viewport;
  /** Chapter accent — when set, tints the path stroke. Falls back to the
   *  default cyan-soft used on chapter-less / debug levels. */
  accent?: string;
  /** Chapter secondary — when set, the stroke is a gradient from accent → secondary. */
  secondary?: string;
}) {
  const lanes = world.level.paths;

  const path = useMemo(() => {
    const p = Skia.Path.Make();
    for (const pts of lanes) {
      if (pts.length < 2) continue;
      const first = viewport.gridToWorld(pts[0]!);
      p.moveTo(first.x, first.y);
      for (let i = 1; i < pts.length; i++) {
        const xy = viewport.gridToWorld(pts[i]!);
        p.lineTo(xy.x, xy.y);
      }
    }
    return p;
  }, [lanes, viewport]);

  const bounds = useMemo(() => path.getBounds(), [path]);

  // Soft tint matches the original primarySoft (~12% alpha) but in the
  // chapter accent so the path reads as part of the chapter palette. When a
  // secondary is supplied, paint the stroke with a linear gradient running
  // along the path's bounding box so each chapter's path reads as two-tone.
  const flatColor = accent ? `${accent}33` : COLORS.primarySoft;
  const useGradient = accent !== undefined && secondary !== undefined;

  return (
    <SkPath
      path={path}
      style="stroke"
      strokeWidth={1}
      {...(useGradient ? {} : { color: flatColor })}
      strokeCap="round"
      strokeJoin="round"
    >
      {useGradient && (
        <LinearGradient
          start={vec(bounds.x, bounds.y)}
          end={vec(bounds.x + bounds.width, bounds.y + bounds.height)}
          colors={[`${accent}44`, `${secondary}44`]}
        />
      )}
    </SkPath>
  );
}
