import React, { useMemo } from 'react';
import { Circle, Group, LinearGradient, Paint, Points, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import type { Viewport } from '@/engine/Viewport';
import { SeededRng } from '@/engine/rng';
import { COLORS } from '@/render/theme';

const ACCENT_OPACITY_HEX = '12'; // ~7% — chapter tint over neutral bg

// Star field is anchored to the canvas (outside the camera transform), so it
// stays fixed while the player pans/zooms — keeps the "deep space" feel without
// parallax cost. All stars render in three Skia draw calls regardless of count.
const STARS_DIM = 90;
const STARS_MID = 35;
const STARS_BRIGHT = 8;

type StarSet = {
  dim: { x: number; y: number }[];
  mid: { x: number; y: number }[];
  bright: { x: number; y: number }[];
};

function buildStars(w: number, h: number, seed: number): StarSet {
  const rng = new SeededRng(seed);
  const gen = (n: number) =>
    Array.from({ length: n }, () => ({
      x: rng.rangeFloat(0, w),
      y: rng.rangeFloat(0, h),
    }));
  return { dim: gen(STARS_DIM), mid: gen(STARS_MID), bright: gen(STARS_BRIGHT) };
}

export function BackgroundLayer({
  viewport,
  accent,
  secondary,
}: {
  viewport: Viewport;
  /** Hex color from `ChapterDef.paletteAccent`. Drives nebula tint and the flat overlay. */
  accent?: string;
  /** Optional secondary hue from `ChapterDef.paletteSecondary`. Tints the second nebula blob for a two-color sky. */
  secondary?: string;
}) {
  const w = viewport.canvasWidthPx;
  const h = viewport.canvasHeightPx;

  // Stable seed: hashed canvas dims + chapter accent — different chapters get a
  // different starfield, but it doesn't shuffle on every re-render.
  const seed = useMemo(() => {
    let s = Math.round(w) * 73856093 + Math.round(h) * 19349663;
    if (accent) for (let i = 0; i < accent.length; i++) s = (s * 31 + accent.charCodeAt(i)) >>> 0;
    return s >>> 0;
  }, [w, h, accent]);

  const stars = useMemo(() => buildStars(w, h, seed), [w, h, seed]);

  // Two off-axis nebula blobs, positions seeded per chapter.
  const nebulae = useMemo(() => {
    const rng = new SeededRng(seed ^ 0xa3b1);
    return [
      {
        cx: rng.rangeFloat(w * 0.1, w * 0.45),
        cy: rng.rangeFloat(h * 0.1, h * 0.4),
        r: Math.max(w, h) * 0.55,
      },
      {
        cx: rng.rangeFloat(w * 0.55, w * 0.9),
        cy: rng.rangeFloat(h * 0.55, h * 0.9),
        r: Math.max(w, h) * 0.45,
      },
    ];
  }, [w, h, seed]);

  const tintFor = (hex: string | undefined): { center: string; edge: string } => {
    if (!hex) return { center: `${COLORS.primary}22`, edge: `${COLORS.primary}00` };
    return { center: `${hex}33`, edge: `${hex}00` };
  };
  const tintA = tintFor(accent);
  // Secondary nebula uses the secondary hue when supplied; otherwise it falls
  // back to the primary so single-hue chapters still render the same way.
  const tintB = tintFor(secondary ?? accent);

  return (
    <Group>
      <Rect x={0} y={0} width={w} height={h} color={COLORS.bg} />

      {/* Nebula gradients — two soft radial blobs themed per chapter. */}
      {nebulae.map((n, i) => {
        const t = i === 0 ? tintA : tintB;
        return (
          <Circle key={i} cx={n.cx} cy={n.cy} r={n.r}>
            <RadialGradient
              c={vec(n.cx, n.cy)}
              r={n.r}
              colors={[t.center, t.edge]}
            />
          </Circle>
        );
      })}

      {/* Vertical accent wash on top — primary at top, secondary at bottom.
          Keeps the grid readable while signalling a two-color identity. */}
      {accent && (
        <Rect x={0} y={0} width={w} height={h}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, h)}
            colors={[
              `${accent}${ACCENT_OPACITY_HEX}`,
              `${(secondary ?? accent)}${ACCENT_OPACITY_HEX}`,
            ]}
          />
        </Rect>
      )}

      {/* Stars — three Points draws, point size = strokeWidth. */}
      <Points points={stars.dim} mode="points">
        <Paint color="#FFFFFF66" strokeWidth={1.2} />
      </Points>
      <Points points={stars.mid} mode="points">
        <Paint color="#FFFFFFAA" strokeWidth={2.2} />
      </Points>
      <Points points={stars.bright} mode="points">
        <Paint color="#FFFFFFEE" strokeWidth={3.4} />
      </Points>
    </Group>
  );
}
