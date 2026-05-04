import React from 'react';
import { Group, Circle } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { World } from '@/world/World';
import type { Viewport } from '@/engine/Viewport';
import type { AoEPulseProjectile } from '@/entities/projectiles/AoEPulseProjectile';

const MAX_PROJECTILES = 64;

type ProjectileSnapshot = { x: number; y: number; kind: string; r: number };

export function ProjectilesLayer({
  world, viewport, redrawTick,
}: { world: World; viewport: Viewport; redrawTick: SharedValue<number> }) {
  const snapshot = useDerivedValue<ProjectileSnapshot[]>(() => {
    redrawTick.value;
    const out: ProjectileSnapshot[] = [];
    for (const p of world.entities.projectiles) {
      if (!p.alive) continue;
      const r = p.kind === 'projectile:aoe-pulse'
        ? (p as AoEPulseProjectile).currentRadius * viewport.tileSize
        : viewport.tileSize * 0.08;
      out.push({ x: p.x * viewport.tileSize, y: p.y * viewport.tileSize, kind: p.kind, r });
      if (out.length >= MAX_PROJECTILES) break;
    }
    return out;
  });

  return (
    <Group>
      {Array.from({ length: MAX_PROJECTILES }, (_, i) => (
        <ProjectileSlot key={i} index={i} snapshot={snapshot} />
      ))}
    </Group>
  );
}

function ProjectileSlot({
  index, snapshot,
}: { index: number; snapshot: SharedValue<ProjectileSnapshot[]> }) {
  const cx = useDerivedValue(() => snapshot.value[index]?.x ?? -1000);
  const cy = useDerivedValue(() => snapshot.value[index]?.y ?? -1000);
  const r = useDerivedValue(() => snapshot.value[index]?.r ?? 0);
  const opacity = useDerivedValue(() => (index < snapshot.value.length ? 0.8 : 0));
  return <Circle cx={cx} cy={cy} r={r} color="#00F0FF" opacity={opacity} />;
}
