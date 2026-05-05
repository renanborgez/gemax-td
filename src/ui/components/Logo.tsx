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
  // We scale the whole scene uniformly so callers can request any pixel size.
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
    return (40 + k * 18) * S;
  }, [S, animate]);

  // ─── Static paths (built once) ─────────────────────────────────────────
  const paths = useMemo(() => {
    const ringOuter = Skia.Path.Make();
    ringOuter.moveTo(512, 148);
    ringOuter.lineTo(841, 338);
    ringOuter.lineTo(841, 718);
    ringOuter.lineTo(512, 908);
    ringOuter.lineTo(183, 718);
    ringOuter.lineTo(183, 338);
    ringOuter.close();

    const ringInner = Skia.Path.Make();
    ringInner.moveTo(512, 228);
    ringInner.lineTo(772, 378);
    ringInner.lineTo(772, 678);
    ringInner.lineTo(512, 828);
    ringInner.lineTo(252, 678);
    ringInner.lineTo(252, 378);
    ringInner.close();

    // Tower tiers (3 trapezoids, narrowing upward)
    const tierBase = Skia.Path.Make();
    tierBase.moveTo(392, 720);
    tierBase.lineTo(632, 720);
    tierBase.lineTo(600, 608);
    tierBase.lineTo(424, 608);
    tierBase.close();

    const tierMid = Skia.Path.Make();
    tierMid.moveTo(424, 604);
    tierMid.lineTo(600, 604);
    tierMid.lineTo(576, 500);
    tierMid.lineTo(448, 500);
    tierMid.close();

    const tierTop = Skia.Path.Make();
    tierTop.moveTo(448, 496);
    tierTop.lineTo(576, 496);
    tierTop.lineTo(556, 396);
    tierTop.lineTo(468, 396);
    tierTop.close();

    // Signal arcs — one quad path each
    const arcL1 = Skia.Path.Make();
    arcL1.moveTo(200, 460);
    arcL1.quadTo(150, 512, 200, 564);
    const arcL2 = Skia.Path.Make();
    arcL2.moveTo(130, 410);
    arcL2.quadTo(60, 512, 130, 614);
    const arcR1 = Skia.Path.Make();
    arcR1.moveTo(824, 460);
    arcR1.quadTo(874, 512, 824, 564);
    const arcR2 = Skia.Path.Make();
    arcR2.moveTo(894, 410);
    arcR2.quadTo(964, 512, 894, 614);

    // Corner brackets
    const brackets = Skia.Path.Make();
    brackets.moveTo(96, 168);  brackets.lineTo(96, 96);   brackets.lineTo(168, 96);
    brackets.moveTo(928, 168); brackets.lineTo(928, 96);  brackets.lineTo(856, 96);
    brackets.moveTo(96, 856);  brackets.lineTo(96, 928);  brackets.lineTo(168, 928);
    brackets.moveTo(928, 856); brackets.lineTo(928, 928); brackets.lineTo(856, 928);

    return { ringOuter, ringInner, tierBase, tierMid, tierTop, arcL1, arcL2, arcR1, arcR2, brackets };
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
        {/* Background plate w/ subtle radial vignette */}
        <Path path={bgPath}>
          <RadialGradient
            c={vec(512, 512)}
            r={620}
            colors={[COLORS.bgCard, COLORS.bg]}
          />
        </Path>

        {/* Faint grid hint */}
        <Group opacity={0.06}>
          <Line p1={vec(0, 256)} p2={vec(1024, 256)} color={COLORS.primary} strokeWidth={1} />
          <Line p1={vec(0, 512)} p2={vec(1024, 512)} color={COLORS.primary} strokeWidth={1} />
          <Line p1={vec(0, 768)} p2={vec(1024, 768)} color={COLORS.primary} strokeWidth={1} />
          <Line p1={vec(256, 0)} p2={vec(256, 1024)} color={COLORS.primary} strokeWidth={1} />
          <Line p1={vec(512, 0)} p2={vec(512, 1024)} color={COLORS.primary} strokeWidth={1} />
          <Line p1={vec(768, 0)} p2={vec(768, 1024)} color={COLORS.primary} strokeWidth={1} />
        </Group>

        {/* Hex outer ring (gradient stroke) */}
        <Path path={paths.ringOuter} style="stroke" strokeWidth={14} strokeJoin="round">
          <LinearGradient
            start={vec(183, 148)}
            end={vec(841, 908)}
            colors={[COLORS.primary, COLORS.secondary]}
          />
        </Path>
        {/* Hex inner soft ring */}
        <Path
          path={paths.ringInner}
          style="stroke"
          strokeWidth={2}
          color={COLORS.primary}
          opacity={0.25}
        />

        {/* Signal arcs */}
        <Group color={COLORS.primary}>
          <Path path={paths.arcL1} style="stroke" strokeWidth={10} strokeCap="round" opacity={0.85} />
          <Path path={paths.arcL2} style="stroke" strokeWidth={6}  strokeCap="round" opacity={0.45} />
          <Path path={paths.arcR1} style="stroke" strokeWidth={10} strokeCap="round" opacity={0.85} />
          <Path path={paths.arcR2} style="stroke" strokeWidth={6}  strokeCap="round" opacity={0.45} />
        </Group>

        {/* Tower tiers (vertical mint→cyan gradient fill) */}
        <Group>
          <Path path={paths.tierBase} opacity={0.95}>
            <LinearGradient
              start={vec(0, 396)}
              end={vec(0, 720)}
              colors={[COLORS.secondary, COLORS.primary, `${COLORS.primary}8C`]}
              positions={[0, 0.55, 1]}
            />
          </Path>
          <Path path={paths.tierMid} opacity={0.92}>
            <LinearGradient
              start={vec(0, 396)}
              end={vec(0, 720)}
              colors={[COLORS.secondary, COLORS.primary, `${COLORS.primary}8C`]}
              positions={[0, 0.55, 1]}
            />
          </Path>
          <Path path={paths.tierTop}>
            <LinearGradient
              start={vec(0, 396)}
              end={vec(0, 720)}
              colors={[COLORS.secondary, COLORS.primary, `${COLORS.primary}8C`]}
              positions={[0, 0.55, 1]}
            />
          </Path>
          {/* Slit highlights */}
          <Group color={COLORS.bg} opacity={0.55}>
            <Path
              path={(() => {
                const p = Skia.Path.Make();
                p.addRRect({
                  rect: { x: 494, y: 430, width: 36, height: 8 },
                  topLeft: { x: 2, y: 2 },
                  topRight: { x: 2, y: 2 },
                  bottomLeft: { x: 2, y: 2 },
                  bottomRight: { x: 2, y: 2 },
                });
                return p;
              })()}
            />
            <Path
              path={(() => {
                const p = Skia.Path.Make();
                p.addRRect({
                  rect: { x: 478, y: 538, width: 68, height: 8 },
                  topLeft: { x: 2, y: 2 },
                  topRight: { x: 2, y: 2 },
                  bottomLeft: { x: 2, y: 2 },
                  bottomRight: { x: 2, y: 2 },
                });
                return p;
              })()}
            />
            <Path
              path={(() => {
                const p = Skia.Path.Make();
                p.addRRect({
                  rect: { x: 462, y: 650, width: 100, height: 8 },
                  topLeft: { x: 2, y: 2 },
                  topRight: { x: 2, y: 2 },
                  bottomLeft: { x: 2, y: 2 },
                  bottomRight: { x: 2, y: 2 },
                });
                return p;
              })()}
            />
          </Group>
        </Group>

        {/* Antenna mast */}
        <Line
          p1={vec(512, 396)}
          p2={vec(512, 296)}
          color={COLORS.secondary}
          strokeWidth={6}
          strokeCap="round"
        />
        {/* Pulse glow (animated) */}
        <Circle cx={512} cy={282} r={48} opacity={0.6}>
          <RadialGradient
            c={vec(512, 282)}
            r={48}
            colors={[COLORS.secondary, `${COLORS.secondary}00`]}
          />
        </Circle>
        <Circle cx={512} cy={282} r={14} color={COLORS.secondary} />
        <Circle cx={512} cy={282} r={6} color={COLORS.textPrimary} />

        {/* Base selection cell */}
        <Group transform={[{ translateX: 512 }, { translateY: 760 }]}>
          <Path
            path={(() => {
              const p = Skia.Path.Make();
              p.addRRect({
                rect: { x: -52, y: -12, width: 104, height: 24 },
                topLeft: { x: 4, y: 4 },
                topRight: { x: 4, y: 4 },
                bottomLeft: { x: 4, y: 4 },
                bottomRight: { x: 4, y: 4 },
              });
              return p;
            })()}
            style="stroke"
            strokeWidth={3}
            color={COLORS.tertiary}
            opacity={0.9}
          />
          <Path
            path={(() => {
              const p = Skia.Path.Make();
              p.addRRect({
                rect: { x: -46, y: -6, width: 92, height: 12 },
                topLeft: { x: 2, y: 2 },
                topRight: { x: 2, y: 2 },
                bottomLeft: { x: 2, y: 2 },
                bottomRight: { x: 2, y: 2 },
              });
              return p;
            })()}
            color={COLORS.tertiary}
            opacity={0.18}
          />
        </Group>

        {/* Corner brackets */}
        <Path
          path={paths.brackets}
          style="stroke"
          strokeWidth={6}
          strokeCap="round"
          color={COLORS.primary}
          opacity={0.85}
        />
      </Group>

      {/* Animated antenna pulse — drawn outside the static scale group so its
          radius can drive directly off pulseR (already pre-scaled). */}
      <Circle cx={size / 2} cy={(282 / 1024) * size} r={pulseR} opacity={0.35}>
        <RadialGradient
          c={vec(size / 2, (282 / 1024) * size)}
          r={(64 / 1024) * size}
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
