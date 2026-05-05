import React from 'react';
import { Group, Circle } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { Viewport } from '@/engine/Viewport';
import type { RangeSnap } from '@/render/snapshot';
import { COLORS } from '@/render/theme';

export function RangeIndicatorLayer({
  viewport, range,
}: { viewport: Viewport; range: SharedValue<RangeSnap> }) {
  const tileSize = viewport.tileSize;
  const cx = useDerivedValue(() => (range.value?.x ?? -1000) * tileSize);
  const cy = useDerivedValue(() => (range.value?.y ?? -1000) * tileSize);
  const r = useDerivedValue(() => (range.value?.r ?? 0) * tileSize);

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={r} color={COLORS.selection} opacity={0.1} />
      <Circle cx={cx} cy={cy} r={r} color={COLORS.selection} opacity={0.85} style="stroke" strokeWidth={3} />
    </Group>
  );
}
