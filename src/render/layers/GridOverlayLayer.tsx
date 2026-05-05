import React from 'react';
import { Group, Rect } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { Viewport } from '@/engine/Viewport';
import type { BuildHintSnap } from '@/render/snapshot';
import { COLORS } from '@/render/theme';

export function GridOverlayLayer({
  viewport, buildHint,
}: { viewport: Viewport; buildHint: SharedValue<BuildHintSnap> }) {
  const tileSize = viewport.tileSize;
  const x = useDerivedValue(() => {
    const h = buildHint.value;
    return h ? h.col * tileSize : 0;
  });
  const y = useDerivedValue(() => {
    const h = buildHint.value;
    return h ? h.row * tileSize : 0;
  });
  const color = useDerivedValue(() => {
    const h = buildHint.value;
    return h && !h.valid ? COLORS.invalidHint : COLORS.buildableHint;
  });
  const opacity = useDerivedValue(() => (buildHint.value ? 0.6 : 0));

  return (
    <Group>
      <Rect x={x} y={y} width={tileSize} height={tileSize} color={color} opacity={opacity} />
    </Group>
  );
}
