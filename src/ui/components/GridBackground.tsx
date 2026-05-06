import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  Canvas,
  LinearGradient,
  Paint,
  Path,
  Points,
  Rect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { SeededRng } from '@/engine/rng';
import { COLORS } from '@/render/theme';

const GRID_SPACING = 28;
const DOT_RADIUS = 0.7;
const STARS_DIM = 70;
const STARS_MID = 25;
const STARS_BRIGHT = 6;

/**
 * Subtle dotted-grid backdrop for menu screens. Draws a faint grid of dots
 * plus a soft cyan vertical glow column that gestures at "datacenter rack
 * lighting" without dominating the page.
 */
export function GridBackground() {
  const { width, height } = useWindowDimensions();
  const path = useMemo(() => buildDotGrid(width, height), [width, height]);
  const stars = useMemo(() => buildStars(width, height), [width, height]);
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
        {/* Stars — three Points draws total. Anchored to viewport, no per-frame work. */}
        <Points points={stars.dim} mode="points">
          <Paint color="#FFFFFF55" strokeWidth={1.1} />
        </Points>
        <Points points={stars.mid} mode="points">
          <Paint color="#FFFFFF99" strokeWidth={2.0} />
        </Points>
        <Points points={stars.bright} mode="points">
          <Paint color="#FFFFFFDD" strokeWidth={3.0} />
        </Points>
      </Canvas>
    </View>
  );
}

function buildStars(w: number, h: number) {
  const seed = (Math.round(w) * 73856093) ^ (Math.round(h) * 19349663);
  const rng = new SeededRng(seed >>> 0);
  const gen = (n: number) =>
    Array.from({ length: n }, () => ({
      x: rng.rangeFloat(0, w),
      y: rng.rangeFloat(0, h),
    }));
  return { dim: gen(STARS_DIM), mid: gen(STARS_MID), bright: gen(STARS_BRIGHT) };
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
