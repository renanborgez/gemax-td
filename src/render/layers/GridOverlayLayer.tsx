import React, { useMemo } from 'react';
import { Group, Path, Rect } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { Viewport } from '@/engine/Viewport';
import type { BuildHintSnap } from '@/render/snapshot';
import { makeBuildableOutlinePath } from '@/render/buildableGridPath';
import type { BuildGrid } from '@/world/Grid';
import { COLORS } from '@/render/theme';

export function GridOverlayLayer({
  viewport, grid, buildHint,
}: {
  viewport: Viewport;
  grid: BuildGrid;
  buildHint: SharedValue<BuildHintSnap>;
}) {
  const tileSize = viewport.tileSize;
  // Static path of every buildable cell. Built once per viewport/grid pair so
  // the layer renders all hints in a single Skia draw call.
  const outlinePath = useMemo(() => makeBuildableOutlinePath(grid, tileSize), [grid, tileSize]);

  const hintX = useDerivedValue(() => {
    const h = buildHint.value;
    return h ? h.col * tileSize : 0;
  });
  const hintY = useDerivedValue(() => {
    const h = buildHint.value;
    return h ? h.row * tileSize : 0;
  });
  const hintColor = useDerivedValue(() => {
    const h = buildHint.value;
    return h && !h.valid ? COLORS.invalidHint : COLORS.buildableHint;
  });
  const hintOpacity = useDerivedValue(() => (buildHint.value ? 0.7 : 0));

  return (
    <Group>
      <Path
        path={outlinePath}
        style="stroke"
        strokeWidth={Math.max(1, tileSize * 0.04)}
        color={COLORS.primaryDim}
        opacity={0.4}
      />
      <Rect
        x={hintX} y={hintY}
        width={tileSize} height={tileSize}
        color={hintColor} opacity={hintOpacity}
      />
    </Group>
  );
}
