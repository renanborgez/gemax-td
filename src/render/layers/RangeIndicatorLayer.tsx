import React from 'react';
import { Circle } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { World } from '@/world/World';
import type { Viewport } from '@/engine/Viewport';
import { COLORS } from '@/render/theme';

export function RangeIndicatorLayer({
  world, viewport, redrawTick,
}: { world: World; viewport: Viewport; redrawTick: SharedValue<number> }) {
  const snap = useDerivedValue(() => {
    redrawTick.value;
    const id = world.selection.towerId;
    if (!id) return { x: -1000, y: -1000, r: 0 };
    const t = world.entities.towers.find((x) => x.id === id);
    if (!t) return { x: -1000, y: -1000, r: 0 };
    return { x: t.x * viewport.tileSize, y: t.y * viewport.tileSize, r: t.base.range * viewport.tileSize };
  });
  const cx = useDerivedValue(() => snap.value.x);
  const cy = useDerivedValue(() => snap.value.y);
  const r = useDerivedValue(() => snap.value.r);

  return <Circle cx={cx} cy={cy} r={r} color={COLORS.selection} opacity={0.18} style="stroke" strokeWidth={2} />;
}
