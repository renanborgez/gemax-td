import React from 'react';
import { Group, Circle } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { Viewport } from '@/engine/Viewport';
import type { WorldSnapshot } from '@/render/snapshot';
import { COLORS } from '@/render/theme';

export function RangeIndicatorLayer({
  viewport, snapshot,
}: { viewport: Viewport; snapshot: SharedValue<WorldSnapshot> }) {
  const tileSize = viewport.tileSize;
  const cx = useDerivedValue(() => (snapshot.value.range?.x ?? -1000) * tileSize);
  const cy = useDerivedValue(() => (snapshot.value.range?.y ?? -1000) * tileSize);
  const r = useDerivedValue(() => (snapshot.value.range?.r ?? 0) * tileSize);

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={r} color={COLORS.selection} opacity={0.1} />
      <Circle cx={cx} cy={cy} r={r} color={COLORS.selection} opacity={0.85} style="stroke" strokeWidth={3} />
    </Group>
  );
}
