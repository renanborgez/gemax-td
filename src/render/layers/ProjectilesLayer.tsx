import React from 'react';
import { Group, Circle, Line } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { Viewport } from '@/engine/Viewport';
import type { WorldSnapshot } from '@/render/snapshot';
import { COLORS } from '@/render/theme';
import { LOGIC_BOMB_RADIUS_TILES } from '@/entities/projectiles/AoEPulseProjectile';
import { CHAIN_ARC_TTL } from '@/entities/projectiles/ChainArcProjectile';

// Each slot fans out to ~24 useDerivedValue worklets (covering circle / bomb /
// hitscan / tracer / chain modes). 24 slots is plenty: hitscan/tracer beams
// despawn within 0.16s; ballistic + poison flights are short; chain/aoe rarely
// stack beyond a handful concurrently. The lower cap keeps total worklets in
// the hundreds rather than 1500+.
const MAX_PROJECTILES = 24;
// Peak vertical lift of the lobbed bomb arc, in tiles.
const BOMB_ARC_HEIGHT = 0.6;
// Tesla coil tops out at 4 chain jumps including the primary; that bounds the
// per-slot segment count we reserve render hooks for. Excess segments would
// silently be skipped, so keep this loose.
const MAX_CHAIN_SEGMENTS = 4;

export function ProjectilesLayer({
  viewport, snapshot,
}: { viewport: Viewport; snapshot: SharedValue<WorldSnapshot> }) {
  return (
    <Group>
      {Array.from({ length: MAX_PROJECTILES }, (_, i) => (
        <ProjectileSlot key={i} index={i} snapshot={snapshot} viewport={viewport} />
      ))}
    </Group>
  );
}

function ProjectileSlot({
  index, snapshot, viewport,
}: { index: number; snapshot: SharedValue<WorldSnapshot>; viewport: Viewport }) {
  const tileSize = viewport.tileSize;

  // Expansion ring (aoe pulse) / generic projectile point.
  const cx = useDerivedValue(() => (snapshot.value.projectiles[index]?.x ?? -1000) * tileSize);
  const cy = useDerivedValue(() => (snapshot.value.projectiles[index]?.y ?? -1000) * tileSize);
  const r = useDerivedValue(() => {
    const p = snapshot.value.projectiles[index];
    if (!p) return 0;
    if (p.kind === 'projectile:hitscan-bolt') return 0;          // drawn as a Line
    if (p.kind === 'projectile:tracer-round') return 0;          // drawn as a Line
    if (p.kind === 'projectile:chain-arc') return 0;             // drawn as Lines
    if (p.kind === 'projectile:aoe-pulse') return p.currentRadius * tileSize;
    if (p.kind === 'projectile:poison-dart') return tileSize * 0.14;
    return tileSize * 0.12;                                       // ballistic bolt
  });
  const circleColor = useDerivedValue(() => {
    const p = snapshot.value.projectiles[index];
    if (!p) return COLORS.primary;
    if (p.kind === 'projectile:poison-dart') return COLORS.acid;
    return COLORS.primary;
  });
  const circleOpacity = useDerivedValue(() => {
    const p = snapshot.value.projectiles[index];
    if (!p) return 0;
    if (p.kind === 'projectile:hitscan-bolt') return 0;
    if (p.kind === 'projectile:tracer-round') return 0;
    if (p.kind === 'projectile:chain-arc') return 0;
    return 0.85;
  });

  // Bomb body for aoe-pulse: small filled disc, lobbed along a parabolic arc
  // during flight, fades as the shockwave expands once detonating.
  const bombCx = cx;
  const bombCy = useDerivedValue(() => {
    const p = snapshot.value.projectiles[index];
    if (!p || p.bombPhase === null) return -1000;
    const baseY = p.y * tileSize;
    if (p.bombPhase !== 'flight') return baseY;
    const lift = Math.sin(p.flightProgress * Math.PI) * BOMB_ARC_HEIGHT * tileSize;
    return baseY - lift;
  });
  const bombR = useDerivedValue(() => {
    const p = snapshot.value.projectiles[index];
    if (!p || p.bombPhase === null) return 0;
    return tileSize * 0.18;
  });
  const bombOpacity = useDerivedValue(() => {
    const p = snapshot.value.projectiles[index];
    if (!p || p.bombPhase === null) return 0;
    if (p.bombPhase === 'flight') return 0.95;
    return Math.max(0, 1 - p.currentRadius / LOGIC_BOMB_RADIUS_TILES);
  });

  // Hitscan beam endpoints (firewall).
  const p1 = useDerivedValue(() => {
    const p = snapshot.value.projectiles[index];
    if (!p || p.kind !== 'projectile:hitscan-bolt') return { x: -1000, y: -1000 };
    return { x: p.fromX * tileSize, y: p.fromY * tileSize };
  });
  const p2 = useDerivedValue(() => {
    const p = snapshot.value.projectiles[index];
    if (!p || p.kind !== 'projectile:hitscan-bolt') return { x: -1000, y: -1000 };
    return { x: p.x * tileSize, y: p.y * tileSize };
  });
  const beamOpacity = useDerivedValue(() => {
    const p = snapshot.value.projectiles[index];
    return p && p.kind === 'projectile:hitscan-bolt' ? 0.95 : 0;
  });

  // Tracer beam endpoints (sniper) — thicker, orange, with a brighter core.
  const tracerP1 = useDerivedValue(() => {
    const p = snapshot.value.projectiles[index];
    if (!p || p.kind !== 'projectile:tracer-round') return { x: -1000, y: -1000 };
    return { x: p.fromX * tileSize, y: p.fromY * tileSize };
  });
  const tracerP2 = useDerivedValue(() => {
    const p = snapshot.value.projectiles[index];
    if (!p || p.kind !== 'projectile:tracer-round') return { x: -1000, y: -1000 };
    return { x: p.x * tileSize, y: p.y * tileSize };
  });
  const tracerOpacity = useDerivedValue(() => {
    const p = snapshot.value.projectiles[index];
    if (!p || p.kind !== 'projectile:tracer-round') return 0;
    // Fade over the projectile's ttl (spawned at 0.16s).
    return Math.max(0, Math.min(1, p.ttl / 0.16));
  });

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={r} color={circleColor} opacity={circleOpacity} />
      <Circle cx={bombCx} cy={bombCy} r={bombR} color={COLORS.danger} opacity={bombOpacity} />
      <Line p1={p1} p2={p2} color={COLORS.primary} style="stroke" strokeWidth={2} opacity={beamOpacity} />
      {/* Sniper tracer: bright orange core, slightly transparent halo. */}
      <Line p1={tracerP1} p2={tracerP2} color={COLORS.tertiary} style="stroke" strokeWidth={4} opacity={tracerOpacity} />
      <Line p1={tracerP1} p2={tracerP2} color={COLORS.textPrimary} style="stroke" strokeWidth={1.5} opacity={tracerOpacity} />
      {Array.from({ length: MAX_CHAIN_SEGMENTS }, (_, i) => (
        <ChainSegmentLine key={i} segIndex={i} slotIndex={index} snapshot={snapshot} tileSize={tileSize} />
      ))}
    </Group>
  );
}

function ChainSegmentLine({
  segIndex, slotIndex, snapshot, tileSize,
}: {
  segIndex: number;
  slotIndex: number;
  snapshot: SharedValue<WorldSnapshot>;
  tileSize: number;
}) {
  const a = useDerivedValue(() => {
    const p = snapshot.value.projectiles[slotIndex];
    if (!p || p.kind !== 'projectile:chain-arc') return { x: -1000, y: -1000 };
    const s = p.chainSegments[segIndex];
    if (!s) return { x: -1000, y: -1000 };
    return { x: s.fromX * tileSize, y: s.fromY * tileSize };
  });
  const b = useDerivedValue(() => {
    const p = snapshot.value.projectiles[slotIndex];
    if (!p || p.kind !== 'projectile:chain-arc') return { x: -1000, y: -1000 };
    const s = p.chainSegments[segIndex];
    if (!s) return { x: -1000, y: -1000 };
    return { x: s.toX * tileSize, y: s.toY * tileSize };
  });
  const op = useDerivedValue(() => {
    const p = snapshot.value.projectiles[slotIndex];
    if (!p || p.kind !== 'projectile:chain-arc') return 0;
    if (!p.chainSegments[segIndex]) return 0;
    // Fade over the projectile's ttl so the whole arc dissipates together.
    return Math.max(0, Math.min(1, p.ttl / CHAIN_ARC_TTL));
  });
  return (
    <Group>
      <Line p1={a} p2={b} color={COLORS.primary} style="stroke" strokeWidth={3.5} opacity={op} />
      <Line p1={a} p2={b} color={COLORS.textPrimary} style="stroke" strokeWidth={1.2} opacity={op} />
    </Group>
  );
}
