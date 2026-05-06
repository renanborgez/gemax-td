import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  Group,
  LinearGradient,
  RadialGradient,
  vec,
  Circle,
  Line,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  useFrameCallback,
} from 'react-native-reanimated';
import { COLORS, TEXT, SPACING } from '@/render/theme';

/**
 * GeMax TD logo, Skia-rendered. Mirrors `assets/logo-mark.svg`.
 *
 * Two layouts:
 *   - `mark`: square glyph only (default).
 *   - `lockup`: glyph + "GeMax TD" wordmark stacked vertically.
 *
 * The antenna pulse animates by default; pass `animate={false}` for splash
 * screens or static captures.
 */
export function Logo({
  size = 220,
  variant = 'mark',
  animate = true,
}: {
  size?: number;
  variant?: 'mark' | 'lockup';
  animate?: boolean;
}) {
  const markSize = size;

  return (
    <View style={styles.root}>
      <LogoMark size={markSize} animate={animate} />
      {variant === 'lockup' && (
        <View style={styles.wordmark}>
          <Text style={styles.eyebrow}>CYBER-DEFENSE LOGIC</Text>
          <Text style={styles.title} numberOfLines={1}>
            <Text style={styles.titleWhite}>GeMax </Text>
            <Text style={styles.titleMint}>TD</Text>
          </Text>
        </View>
      )}
    </View>
  );
}

function LogoMark({ size, animate }: { size: number; animate: boolean }) {
  // Master art is authored on a 1024x1024 canvas (matches logo-mark.svg).
  // Caller sizes the canvas; we scale the scene uniformly.
  const S = size / 1024;

  const time = useSharedValue(0);
  useFrameCallback((info) => {
    if (!animate) return;
    time.value += (info.timeSincePreviousFrame ?? 16) / 1000;
  }, true);

  // Antenna pulse: 0..1 sine wave -> radius scale.
  const pulseR = useDerivedValue(() => {
    const t = animate ? time.value : 0;
    const k = 0.5 + 0.5 * Math.sin(t * 2.4);
    return (52 + k * 22) * S;
  }, [S, animate]);

  // ─── Static paths (built once) ─────────────────────────────────────────
  const paths = useMemo(() => {
    // Bold "G" letterform — single open path stroked with rounded caps/joins.
    // Letter bounds 320..704 x, 288..736 y. Stroke 120 widens visual to
    // ~260..764 x, ~228..796 y. Tongue tip lands at canvas center (512, 552)
    // for a classic G with a slightly-below-mid balcony.
    const gPath = Skia.Path.Make();
    gPath.moveTo(704, 408);
    gPath.quadTo(704, 288, 584, 288);
    gPath.lineTo(440, 288);
    gPath.quadTo(320, 288, 320, 408);
    gPath.lineTo(320, 616);
    gPath.quadTo(320, 736, 440, 736);
    gPath.lineTo(584, 736);
    gPath.quadTo(704, 736, 704, 616);
    gPath.lineTo(704, 552);
    gPath.lineTo(512, 552);

    return { gPath };
  }, []);

  // Background plate path (rounded square)
  const bgPath = useMemo(() => {
    const p = Skia.Path.Make();
    const r = 180;
    p.addRRect({
      rect: { x: 0, y: 0, width: 1024, height: 1024 },
      topLeft: { x: r, y: r },
      topRight: { x: r, y: r },
      bottomLeft: { x: r, y: r },
      bottomRight: { x: r, y: r },
    });
    return p;
  }, []);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={[{ scale: S }]}>
        {/* Background plate w/ subtle vertical gradient */}
        <Path path={bgPath}>
          <LinearGradient
            start={vec(512, 0)}
            end={vec(512, 1024)}
            colors={[COLORS.bgCard, COLORS.bg]}
          />
        </Path>

        {/* "G" letterform (mint -> cyan vertical gradient stroke) */}
        <Path
          path={paths.gPath}
          style="stroke"
          strokeWidth={120}
          strokeJoin="round"
          strokeCap="round"
        >
          <LinearGradient
            start={vec(0, 228)}
            end={vec(0, 796)}
            colors={[COLORS.secondary, COLORS.primary]}
          />
        </Path>

        {/* Antenna mast rising from top of "G" */}
        <Line
          p1={vec(512, 228)}
          p2={vec(512, 152)}
          color={COLORS.secondary}
          strokeWidth={20}
          strokeCap="round"
        />

        {/* Static pulse halo + dot */}
        <Circle cx={512} cy={124} r={56} opacity={0.6}>
          <RadialGradient
            c={vec(512, 124)}
            r={56}
            colors={[COLORS.secondary, `${COLORS.secondary}00`]}
          />
        </Circle>
        <Circle cx={512} cy={124} r={22} color={COLORS.secondary} />
        <Circle cx={512} cy={124} r={8} color={COLORS.textPrimary} />
      </Group>

      {/* Animated outer pulse — drawn outside the static scale group so its
          radius can drive directly off pulseR (already pre-scaled). */}
      <Circle cx={size / 2} cy={(124 / 1024) * size} r={pulseR} opacity={0.35}>
        <RadialGradient
          c={vec(size / 2, (124 / 1024) * size)}
          r={(80 / 1024) * size}
          colors={[COLORS.secondary, `${COLORS.secondary}00`]}
        />
      </Circle>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  wordmark: {
    alignItems: 'center',
    gap: 2,
  },
  eyebrow: {
    ...TEXT.labelSmall,
    fontSize: 10,
    letterSpacing: 3,
    color: COLORS.textMuted,
  },
  title: {
    ...TEXT.display,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
  },
  titleWhite: { color: COLORS.textPrimary },
  titleMint: { color: COLORS.secondary },
});
