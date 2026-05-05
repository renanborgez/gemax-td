import React from 'react';
import { Image, Rect, useImage } from '@shopify/react-native-skia';
import type { Viewport } from '@/engine/Viewport';
import { COLORS } from '@/render/theme';

const BG_SOURCE = require('../../../assets/bg_02_h.png');

export function BackgroundLayer({ viewport }: { viewport: Viewport }) {
  const image = useImage(BG_SOURCE);
  const { canvasWidthPx: w, canvasHeightPx: h } = viewport;
  if (!image) {
    return <Rect x={0} y={0} width={w} height={h} color={COLORS.bg} />;
  }
  return (
    <>
      <Image image={image} x={0} y={0} width={w} height={h} fit="cover" />
      <Rect x={0} y={0} width={w} height={h} color="rgba(0,0,0,0.7)" />
    </>
  );
}
