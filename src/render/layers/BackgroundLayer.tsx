import React from 'react';
import { Rect } from '@shopify/react-native-skia';
import type { Viewport } from '@/engine/Viewport';
import { COLORS } from '@/render/theme';

export function BackgroundLayer({ viewport }: { viewport: Viewport }) {
  return <Rect x={0} y={0} width={viewport.canvasWidthPx} height={viewport.canvasHeightPx} color={COLORS.bg} />;
}
