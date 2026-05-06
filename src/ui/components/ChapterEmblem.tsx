import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Group, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  useFrameCallback,
} from 'react-native-reanimated';

/**
 * Per-chapter 2D faction emblem. Outer hex frame slowly rotates around a
 * chapter-specific silhouette, with ambient particles orbiting at the rim.
 * Renders as a stack of crisp + glow stroke passes painted by Skia.
 *
 * Design intent: silhouettes read as faction crests, not a 3D scene. Each
 * chapter ships its own silhouette + particle mode; the outer frame is shared
 * so the menu reads as a unified set of badges.
 */

type ParticleMode = 'orbit' | 'inward' | 'rise';

type Recipe = {
  /** Build the silhouette in screen coords centered at (cx, cy) with size R. */
  silhouette: (skp: SkPath, cx: number, cy: number, R: number) => void;
  /** Optional dim background detail (under particles, behind silhouette). */
  underlay?: (skp: SkPath, cx: number, cy: number, R: number) => void;
  /** Particle motion preset. */
  particleMode: ParticleMode;
  /** Particle count. */
  particleCount: number;
};

// ─── Drawing primitives ──────────────────────────────────────────────────────

function arcLine(
  skp: SkPath, cx: number, cy: number, r: number,
  a0: number, a1: number, steps = 24,
): void {
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (a1 - a0) * (i / steps);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) skp.moveTo(x, y); else skp.lineTo(x, y);
  }
}

function polygon(
  skp: SkPath, cx: number, cy: number, r: number, sides: number, rot = 0,
): void {
  for (let i = 0; i <= sides; i++) {
    const a = (i / sides) * Math.PI * 2 + rot;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) skp.moveTo(x, y); else skp.lineTo(x, y);
  }
}

function rect(
  skp: SkPath, x: number, y: number, w: number, h: number,
): void {
  skp.addRect(Skia.XYWHRect(x, y, w, h));
}

function buildHexFrame(skp: SkPath, cx: number, cy: number, R: number): void {
  const sides = 6;
  const tickLen = R * 0.09;
  // Rotated 30° so flats sit top/bottom — reads as badge frame.
  polygon(skp, cx, cy, R, sides, Math.PI / 6);
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 + Math.PI / 6;
    const x1 = cx + Math.cos(a) * R;
    const y1 = cy + Math.sin(a) * R;
    const x2 = cx + Math.cos(a) * (R + tickLen);
    const y2 = cy + Math.sin(a) * (R + tickLen);
    skp.moveTo(x1, y1); skp.lineTo(x2, y2);
  }
  // Inner thin ring for depth.
  polygon(skp, cx, cy, R * 0.92, sides, Math.PI / 6);
}

// ─── Per-chapter silhouettes ─────────────────────────────────────────────────

// 0 INTRANET — three server racks with horizontal slats.
function silhouetteIntranet(skp: SkPath, cx: number, cy: number, R: number) {
  const colW = R * 0.30, colH = R * 1.20, gap = R * 0.50;
  for (const xc of [-gap, 0, gap]) {
    rect(skp, cx + xc - colW / 2, cy - colH / 2, colW, colH);
    for (let s = 1; s <= 4; s++) {
      const sy = cy - colH / 2 + (s / 5) * colH;
      skp.moveTo(cx + xc - colW / 2 + R * 0.04, sy);
      skp.lineTo(cx + xc + colW / 2 - R * 0.04, sy);
    }
  }
  // Base plinth.
  skp.moveTo(cx - R * 0.85, cy + colH / 2 + R * 0.06);
  skp.lineTo(cx + R * 0.85, cy + colH / 2 + R * 0.06);
}

// 1 UPLINK — broadcast tower with signal arcs.
function silhouetteUplink(skp: SkPath, cx: number, cy: number, R: number) {
  const top = cy - R * 0.95, base = cy + R * 0.70, baseHalf = R * 0.40;
  skp.moveTo(cx - baseHalf, base);
  skp.lineTo(cx, top);
  skp.lineTo(cx + baseHalf, base);
  for (const t of [0.30, 0.55, 0.80]) {
    const y = top + (base - top) * t;
    const half = baseHalf * t;
    skp.moveTo(cx - half, y);
    skp.lineTo(cx + half, y);
  }
  // Signal arcs fan above antenna apex.
  for (const ar of [R * 0.55, R * 0.80, R * 1.05]) {
    arcLine(skp, cx, top, ar, Math.PI * 1.15, Math.PI * 1.85, 28);
  }
  // Foundation pad.
  skp.moveTo(cx - R * 0.55, base);
  skp.lineTo(cx + R * 0.55, base);
}

// 2 CLOUD — cluster of nodes, drips below.
function silhouetteCloud(skp: SkPath, cx: number, cy: number, R: number) {
  const nodes: Array<readonly [number, number, number]> = [
    [-0.55, -0.10, 0.30],
    [-0.18, -0.45, 0.28],
    [ 0.22, -0.50, 0.30],
    [ 0.60, -0.15, 0.27],
    [ 0.00,  0.10, 0.36],
  ];
  for (const [nx, ny, nr] of nodes) {
    skp.addCircle(cx + nx * R, cy + ny * R, nr * R);
  }
  for (const xx of [-0.45, -0.10, 0.20, 0.50]) {
    const len = R * (0.30 + (xx + 0.5) * 0.20);
    skp.moveTo(cx + xx * R, cy + R * 0.40);
    skp.lineTo(cx + xx * R, cy + R * 0.40 + len);
  }
}

// 3 MAINFRAME — nested hexes + crosshair.
function silhouetteMainframe(skp: SkPath, cx: number, cy: number, R: number) {
  polygon(skp, cx, cy, R * 0.40, 6, Math.PI / 6);
  polygon(skp, cx, cy, R * 0.70, 6, 0);
  polygon(skp, cx, cy, R * 1.00, 6, Math.PI / 6);
  // Crosshair.
  skp.moveTo(cx - R * 0.18, cy); skp.lineTo(cx + R * 0.18, cy);
  skp.moveTo(cx, cy - R * 0.18); skp.lineTo(cx, cy + R * 0.18);
  // Spokes from center hex out to mid hex.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * R * 0.40;
    const y1 = cy + Math.sin(a) * R * 0.40;
    const x2 = cx + Math.cos(a) * R * 0.70;
    const y2 = cy + Math.sin(a) * R * 0.70;
    skp.moveTo(x1, y1); skp.lineTo(x2, y2);
  }
}

// 4 FIRMWARE — chip with pin legs.
function silhouetteFirmware(skp: SkPath, cx: number, cy: number, R: number) {
  const cs = R * 1.10;
  rect(skp, cx - cs / 2, cy - cs / 2, cs, cs);
  const inner = cs * 0.55;
  rect(skp, cx - inner / 2, cy - inner / 2, inner, inner);
  // Crosshair inside inner box.
  skp.moveTo(cx - inner / 2, cy); skp.lineTo(cx + inner / 2, cy);
  skp.moveTo(cx, cy - inner / 2); skp.lineTo(cx, cy + inner / 2);
  // Pins, 5 per side.
  const pinLen = R * 0.22, pinCount = 5;
  for (let i = 0; i < pinCount; i++) {
    const t = (i + 0.5) / pinCount;
    const off = -cs / 2 + t * cs;
    skp.moveTo(cx + off, cy - cs / 2); skp.lineTo(cx + off, cy - cs / 2 - pinLen);
    skp.moveTo(cx + off, cy + cs / 2); skp.lineTo(cx + off, cy + cs / 2 + pinLen);
    skp.moveTo(cx - cs / 2, cy + off); skp.lineTo(cx - cs / 2 - pinLen, cy + off);
    skp.moveTo(cx + cs / 2, cy + off); skp.lineTo(cx + cs / 2 + pinLen, cy + off);
  }
  // Orientation notch (top-left dot).
  skp.addCircle(cx - cs / 2 + R * 0.10, cy - cs / 2 + R * 0.10, R * 0.04);
}

// 5 DARKNET — onion: nested teardrops with vertical stem.
function silhouetteDarknet(skp: SkPath, cx: number, cy: number, R: number) {
  const baseY = cy + R * 0.55;
  // Body: nested half-ellipses.
  for (const r of [R * 0.45, R * 0.65, R * 0.85]) {
    arcLine(skp, cx, baseY, r, Math.PI * 1.0, Math.PI * 2.0, 28);
  }
  // Base line.
  skp.moveTo(cx - R * 0.85, baseY);
  skp.lineTo(cx + R * 0.85, baseY);
  // Stem.
  skp.moveTo(cx, baseY - R * 0.85);
  skp.lineTo(cx, baseY - R * 1.10);
  // Tip leaf (small triangle at top).
  skp.moveTo(cx - R * 0.08, baseY - R * 1.05);
  skp.lineTo(cx, baseY - R * 1.30);
  skp.lineTo(cx + R * 0.08, baseY - R * 1.05);
}

// 6 QUANTUM — overlapping orbits + nodes.
function silhouetteQuantum(skp: SkPath, cx: number, cy: number, R: number) {
  // Two ellipses rotated 60° apart, approximated as offset circles.
  const rx = R * 0.85, ry = R * 0.45;
  // Ellipse A (rotated 30°).
  for (const rot of [Math.PI / 6, -Math.PI / 6, Math.PI / 2]) {
    const steps = 36;
    const cosR = Math.cos(rot), sinR = Math.sin(rot);
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const ex = Math.cos(a) * rx;
      const ey = Math.sin(a) * ry;
      const x = cx + ex * cosR - ey * sinR;
      const y = cy + ex * sinR + ey * cosR;
      if (i === 0) skp.moveTo(x, y); else skp.lineTo(x, y);
    }
  }
  // Central nucleus.
  skp.addCircle(cx, cy, R * 0.10);
}

// 7 LOGIC — AND-gate symbol with inputs/output.
function silhouetteLogic(skp: SkPath, cx: number, cy: number, R: number) {
  const gh = R * 0.95, rectW = R * 0.55;
  const left = cx - R * 0.70;
  const flat = left + rectW;
  const top = cy - gh / 2, bot = cy + gh / 2;
  // Rectangle (left + top + bottom).
  skp.moveTo(flat, top);
  skp.lineTo(left, top);
  skp.lineTo(left, bot);
  skp.lineTo(flat, bot);
  // Semicircle output.
  arcLine(skp, flat, cy, gh / 2, -Math.PI / 2, Math.PI / 2, 28);
  // Inputs (2 wires from left).
  const inLen = R * 0.30;
  skp.moveTo(left - inLen, cy - gh * 0.28); skp.lineTo(left, cy - gh * 0.28);
  skp.moveTo(left - inLen, cy + gh * 0.28); skp.lineTo(left, cy + gh * 0.28);
  // Output wire.
  const outX = flat + gh / 2;
  skp.moveTo(outX, cy); skp.lineTo(outX + inLen, cy);
  // Pad pin dots at wire ends.
  skp.addCircle(left - inLen, cy - gh * 0.28, R * 0.03);
  skp.addCircle(left - inLen, cy + gh * 0.28, R * 0.03);
  skp.addCircle(outX + inLen, cy, R * 0.03);
}

// 8 VOID — event horizon disk + accretion arcs.
function silhouetteVoid(skp: SkPath, cx: number, cy: number, R: number) {
  // Inner singularity ring.
  skp.addCircle(cx, cy, R * 0.30);
  // Event horizon.
  skp.addCircle(cx, cy, R * 0.55);
  // Accretion arcs at varying radii.
  arcLine(skp, cx, cy, R * 0.78, Math.PI * 0.05, Math.PI * 0.55, 28);
  arcLine(skp, cx, cy, R * 0.90, Math.PI * 1.15, Math.PI * 1.85, 32);
  arcLine(skp, cx, cy, R * 1.02, Math.PI * 0.65, Math.PI * 0.95, 22);
  arcLine(skp, cx, cy, R * 1.02, Math.PI * 1.95, Math.PI * 2.30, 22);
}

function underlayVoid(skp: SkPath, cx: number, cy: number, R: number) {
  // Faint full ring at outer edge for depth.
  skp.addCircle(cx, cy, R * 1.10);
}

// 9 APEX — tall pyramid + smaller spires.
function silhouetteApex(skp: SkPath, cx: number, cy: number, R: number) {
  // Central pyramid.
  skp.moveTo(cx, cy - R * 1.00);
  skp.lineTo(cx + R * 0.55, cy + R * 0.70);
  skp.lineTo(cx - R * 0.55, cy + R * 0.70);
  skp.close();
  // Inner spine.
  skp.moveTo(cx, cy - R * 1.00);
  skp.lineTo(cx, cy + R * 0.70);
  // Horizontal mid-strut.
  skp.moveTo(cx - R * 0.30, cy + R * 0.05);
  skp.lineTo(cx + R * 0.30, cy + R * 0.05);
  // Three base spires.
  for (const xx of [-0.45, 0, 0.45]) {
    const px = cx + xx * R;
    skp.moveTo(px - R * 0.08, cy + R * 0.70);
    skp.lineTo(px, cy + R * 0.45);
    skp.lineTo(px + R * 0.08, cy + R * 0.70);
  }
  // Base line.
  skp.moveTo(cx - R * 0.65, cy + R * 0.70);
  skp.lineTo(cx + R * 0.65, cy + R * 0.70);
}

// ─── Recipe table ────────────────────────────────────────────────────────────

const RECIPES: Readonly<Record<number, Recipe>> = {
  0: { silhouette: silhouetteIntranet,  particleMode: 'orbit',  particleCount: 10 },
  1: { silhouette: silhouetteUplink,    particleMode: 'rise',   particleCount: 12 },
  2: { silhouette: silhouetteCloud,     particleMode: 'orbit',  particleCount: 14 },
  3: { silhouette: silhouetteMainframe, particleMode: 'orbit',  particleCount: 12 },
  4: { silhouette: silhouetteFirmware,  particleMode: 'orbit',  particleCount: 10 },
  5: { silhouette: silhouetteDarknet,   particleMode: 'orbit',  particleCount: 10 },
  6: { silhouette: silhouetteQuantum,   particleMode: 'orbit',  particleCount: 14 },
  7: { silhouette: silhouetteLogic,     particleMode: 'orbit',  particleCount: 10 },
  8: { silhouette: silhouetteVoid,      underlay: underlayVoid, particleMode: 'inward', particleCount: 18 },
  9: { silhouette: silhouetteApex,      particleMode: 'rise',   particleCount: 14 },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ChapterEmblem({
  chapterIndex,
  accent,
  secondary,
  size = 220,
  width,
  height,
}: {
  chapterIndex: number;
  /** Hex color used for the silhouette stroke + main glow tint. */
  accent: string;
  /** Optional second hue used for frame glow + particle wash so the emblem isn't monochrome. */
  secondary?: string;
  /** Square render size (used when width/height not provided). */
  size?: number;
  width?: number;
  height?: number;
}) {
  const recipe = RECIPES[chapterIndex] ?? RECIPES[0]!;
  const w = width ?? size;
  const h = height ?? size;
  const cx = w / 2;
  const cy = h / 2;
  // R = silhouette radius. Frame sits at R * 1.18, particles orbit at R * 1.55.
  const R = Math.min(w, h) * 0.28;
  const frameR = R * 1.18;
  const orbitR = R * 1.55;
  const particleCount = recipe.particleCount;
  const particleMode = recipe.particleMode;

  const framePath = useMemo(() => {
    const p = Skia.Path.Make();
    buildHexFrame(p, cx, cy, frameR);
    return p;
  }, [cx, cy, frameR]);

  const silhouettePath = useMemo(() => {
    const p = Skia.Path.Make();
    recipe.silhouette(p, cx, cy, R);
    return p;
  }, [recipe, cx, cy, R]);

  const underlayPath = useMemo(() => {
    if (!recipe.underlay) return null;
    const p = Skia.Path.Make();
    recipe.underlay(p, cx, cy, R);
    return p;
  }, [recipe, cx, cy, R]);

  const time = useSharedValue(0);
  useFrameCallback((info) => {
    'worklet';
    time.value = info.timestamp / 1000;
  }, true);

  const frameTransform = useDerivedValue(() => {
    'worklet';
    return [{ rotate: time.value * 0.06 }];
  });

  const silhouetteTransform = useDerivedValue(() => {
    'worklet';
    const s = 1 + Math.sin(time.value * 0.8) * 0.025;
    return [{ scale: s }];
  });

  const particlesPath = useDerivedValue<SkPath>(() => {
    'worklet';
    const t = time.value;
    const skp = Skia.Path.Make();
    for (let i = 0; i < particleCount; i++) {
      const phase = (i / particleCount) * Math.PI * 2;
      let x: number, y: number, sz: number;

      if (particleMode === 'inward') {
        // Falling toward center. Each particle has its own period; r cycles
        // from orbitR down to frameR and respawns.
        const period = 4 + (i % 4) * 0.7;
        const local = ((t + i * 0.31) % period) / period; // 0..1
        const r = orbitR - (orbitR - frameR * 0.85) * local;
        const a = phase + t * 0.25 * (i % 2 === 0 ? 1 : -1);
        x = cx + Math.cos(a) * r;
        y = cy + Math.sin(a) * r;
        sz = (R * 0.030) * (1 - local * 0.5);
      } else if (particleMode === 'rise') {
        // Drift upward, respawn below.
        const period = 5 + (i % 5) * 0.4;
        const local = ((t + i * 0.41) % period) / period;
        const r = orbitR + (i % 3 - 1) * R * 0.08;
        const swayX = Math.cos(phase + t * 0.3) * r;
        // y starts at +R*1.6 (below) and rises to -R*1.6 (above).
        const yBand = R * 1.55;
        x = cx + swayX;
        y = cy + yBand - local * yBand * 2;
        sz = R * 0.028 * (1 - Math.abs(local - 0.5));
      } else {
        // orbit
        const speed = 0.18 + (i % 4) * 0.04;
        const dir = (i % 2 === 0 ? 1 : -1);
        const a = phase + t * speed * dir;
        const r = orbitR + Math.sin(t * 0.6 + i) * (R * 0.08);
        x = cx + Math.cos(a) * r;
        y = cy + Math.sin(a) * r;
        sz = R * 0.028 + Math.sin(t * 1.4 + i) * R * 0.012;
      }

      const finalSz = sz > 0.5 ? sz : 0.5;
      skp.addCircle(x, y, finalSz);
    }
    return skp;
  });

  const glow = `${accent}33`;
  const dim = `${accent}66`;
  const particleColor = `${accent}AA`;
  // Frame glow tint: prefer the chapter's secondary hue so the badge reads as
  // two-color (frame vs silhouette). Falls back to the silhouette glow when no
  // secondary is provided.
  const frameGlow = secondary ? `${secondary}55` : glow;
  const frameDim = secondary ? `${secondary}88` : dim;

  return (
    <View style={[styles.root, { width: w, height: h }]} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFillObject}>
        {/* Outer rotating hex frame. */}
        <Group origin={{ x: cx, y: cy }} transform={frameTransform}>
          <Path
            path={framePath} style="stroke" strokeWidth={4}
            color={frameGlow} strokeCap="round" strokeJoin="round"
          />
          <Path
            path={framePath} style="stroke" strokeWidth={1.2}
            color={frameDim} strokeCap="round" strokeJoin="round"
          />
        </Group>

        {/* Optional dim underlay. */}
        {underlayPath && (
          <Path
            path={underlayPath} style="stroke" strokeWidth={1}
            color={dim} strokeCap="round" strokeJoin="round"
          />
        )}

        {/* Ambient particles. */}
        <Path path={particlesPath} style="fill" color={particleColor} />

        {/* Pulsing silhouette: glow then crisp. */}
        <Group origin={{ x: cx, y: cy }} transform={silhouetteTransform}>
          <Path
            path={silhouettePath} style="stroke" strokeWidth={6}
            color={glow} strokeCap="round" strokeJoin="round"
          />
          <Path
            path={silhouettePath} style="stroke" strokeWidth={1.8}
            color={accent} strokeCap="round" strokeJoin="round"
          />
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'center',
    overflow: 'hidden',
  },
});
