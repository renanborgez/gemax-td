import React from 'react';
import { Group, Rect } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { World } from '@/world/World';
import type { Viewport } from '@/engine/Viewport';
import { COLORS } from '@/render/theme';

export function GridOverlayLayer({
  world, viewport, redrawTick,
}: { world: World; viewport: Viewport; redrawTick: SharedValue<number> }) {
  const items = useDerivedValue(() => {
    redrawTick.value;     // dependency
    const out: Array<{ x: number; y: number; size: number; color: string }> = [];
    const sel = world.selection.buildSpot;
    if (!sel) return out;
    const xy = viewport.gridToWorld(sel);
    const valid = world.grid.canBuild(sel);
    out.push({
      x: xy.x - viewport.tileSize / 2,
      y: xy.y - viewport.tileSize / 2,
      size: viewport.tileSize,
      color: valid ? COLORS.buildableHint : COLORS.invalidHint,
    });
    return out;
  });

  const x = useDerivedValue(() => items.value[0]?.x ?? 0);
  const y = useDerivedValue(() => items.value[0]?.y ?? 0);
  const width = useDerivedValue(() => items.value[0]?.size ?? 0);
  const height = useDerivedValue(() => items.value[0]?.size ?? 0);
  const color = useDerivedValue(() => items.value[0]?.color ?? COLORS.buildableHint);
  const opacity = useDerivedValue(() => (items.value.length > 0 ? 0.6 : 0));

  return (
    <Group>
      <Rect x={x} y={y} width={width} height={height} color={color} opacity={opacity} />
    </Group>
  );
}
