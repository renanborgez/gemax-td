import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Canvas, Path, Skia, vec, LinearGradient, Rect } from '@shopify/react-native-skia';
import { COLORS } from '@/render/theme';

const GRID_SPACING = 28;
const DOT_RADIUS = 0.7;

/**
 * Subtle dotted-grid backdrop for menu screens. Draws a faint grid of dots
 * plus a soft cyan vertical glow column that gestures at "datacenter rack
 * lighting" without dominating the page.
 */
export function GridBackground() {
  const { width, height } = useWindowDimensions();
  const path = useMemo(() => buildDotGrid(width, height), [width, height]);
  const glowX = width * 0.5;
  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: COLORS.bg }]} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Page-wide vertical gradient — slightly brighter at top, fades to pure bg. */}
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height)}
            colors={['#11151D', COLORS.bg]}
          />
        </Rect>
        {/* Soft vertical cyan column — datacenter rack glow. */}
        <Rect x={glowX - 80} y={0} width={160} height={height} opacity={0.06}>
          <LinearGradient
            start={vec(glowX - 80, 0)}
            end={vec(glowX + 80, 0)}
            colors={['#00000000', COLORS.primary, '#00000000']}
          />
        </Rect>
        {/* Faint dot grid. */}
        <Path path={path} color={COLORS.border} opacity={0.55} />
      </Canvas>
    </View>
  );
}

function buildDotGrid(w: number, h: number) {
  const path = Skia.Path.Make();
  for (let x = GRID_SPACING / 2; x < w; x += GRID_SPACING) {
    for (let y = GRID_SPACING / 2; y < h; y += GRID_SPACING) {
      path.addCircle(x, y, DOT_RADIUS);
    }
  }
  return path;
}
