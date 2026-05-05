import React from 'react';
import { Rect } from '@shopify/react-native-skia';
import type { Viewport } from '@/engine/Viewport';
import { COLORS } from '@/render/theme';

const ACCENT_OPACITY_HEX = '26'; // ~15% — chapter tint over neutral bg

export function BackgroundLayer({
  viewport,
  accent,
}: {
  viewport: Viewport;
  /** Hex color from `ChapterDef.paletteAccent`. Drawn as a subtle overlay over the neutral bg. */
  accent?: string;
}) {
  return (
    <>
      <Rect x={0} y={0} width={viewport.canvasWidthPx} height={viewport.canvasHeightPx} color={COLORS.bg} />
      {accent && (
        <Rect
          x={0}
          y={0}
          width={viewport.canvasWidthPx}
          height={viewport.canvasHeightPx}
          color={`${accent}${ACCENT_OPACITY_HEX}`}
        />
      )}
    </>
  );
}
