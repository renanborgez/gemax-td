import React from 'react';
import { Group, Circle, Line } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { Viewport } from '@/engine/Viewport';
import type { WorldSnapshot } from '@/render/snapshot';

const MAX_PROJECTILES = 64;

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

  // Circle (ballistic / aoe pulse) target point.
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
      <Circle cx={cx} cy={cy} r={r} color="#44EEFF" opacity={circleOpacity} />
      <Line p1={p1} p2={p2} color="#44EEFF" style="stroke" strokeWidth={2} opacity={beamOpacity} />
    </Group>
  );
}
