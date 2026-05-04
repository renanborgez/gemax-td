import React from 'react';
import { Group, Circle, Line } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { Viewport } from '@/engine/Viewport';
import type { WorldSnapshot } from '@/render/snapshot';
import { COLORS } from '@/render/theme';
import { LOGIC_BOMB_RADIUS_TILES } from '@/entities/projectiles/AoEPulseProjectile';

const MAX_PROJECTILES = 64;
// Peak vertical lift of the lobbed bomb arc, in tiles.
const BOMB_ARC_HEIGHT = 0.6;

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

  // Expansion ring (aoe pulse) / ballistic bolt point.
  const cx = useDerivedValue(() => (snapshot.value.projectiles[index]?.x ?? -1000) * tileSize);
  const cy = useDerivedValue(() => (snapshot.value.projectiles[index]?.y ?? -1000) * tileSize);
  const r = useDerivedValue(() => {
    const p = snapshot.value.projectiles[index];
    if (!p) return 0;
    if (p.kind === 'projectile:hitscan-bolt') return 0;          // drawn as a Line, not a Circle
    if (p.kind === 'projectile:aoe-pulse') return p.currentRadius * tileSize;
    return tileSize * 0.12;                                       // ballistic bolt
  });
  const circleOpacity = useDerivedValue(() => {
    const p = snapshot.value.projectiles[index];
    if (!p) return 0;
    if (p.kind === 'projectile:hitscan-bolt') return 0;
    return 0.85;
  });

  // Bomb body: a small filled disc that travels with the projectile during the
  // flight phase and stays put while the explosion expands underneath it.
  // Y is lifted along a parabolic arc (sin curve) so the throw reads as lobbed.
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
    // Detonating: fade the body as the shockwave expands so it doesn't fight the ring.
    return Math.max(0, 1 - p.currentRadius / LOGIC_BOMB_RADIUS_TILES);
  });

  // Hitscan beam endpoints.
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

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={r} color={COLORS.primary} opacity={circleOpacity} />
      <Circle cx={bombCx} cy={bombCy} r={bombR} color={COLORS.danger} opacity={bombOpacity} />
      <Line p1={p1} p2={p2} color={COLORS.primary} style="stroke" strokeWidth={2} opacity={beamOpacity} />
    </Group>
  );
}
