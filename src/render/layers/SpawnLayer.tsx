import React from 'react';
import { Circle, Group } from '@shopify/react-native-skia';
import type { Viewport } from '@/engine/Viewport';
import type { World } from '@/world/World';
import { COLORS } from '@/render/theme';

/**
 * Spawn portal — dark-red marker at the path's origin where enemies emerge.
 * Concentric rings with a deep void at the center; sits below towers/enemies
 * so spawning units render on top.
 */
export function SpawnLayer({ world, viewport }: { world: World; viewport: Viewport }) {
  const pts = world.level.path;
  if (pts.length === 0) return null;
  const first = pts[0]!;
  const { x, y } = viewport.gridToWorld(first);
  const tile = viewport.tileSize;
  const r = tile * 0.5;
  const stroke = Math.max(1.2, tile * 0.05);

  return (
    <Group>
      <Circle cx={x} cy={y} r={r * 1.45} color={COLORS.danger} opacity={0.10} />
      <Circle cx={x} cy={y} r={r * 1.1} color={COLORS.danger} opacity={0.22} />
      <Circle
        cx={x}
        cy={y}
        r={r * 1.05}
        color={COLORS.danger}
        opacity={0.65}
        style="stroke"
        strokeWidth={stroke}
      />
      <Circle cx={x} cy={y} r={r * 0.78} color={COLORS.enemyHpBg} />
      <Circle
        cx={x}
        cy={y}
        r={r * 0.55}
        color={COLORS.danger}
        opacity={0.5}
        style="stroke"
        strokeWidth={stroke * 0.8}
      />
      <Circle cx={x} cy={y} r={r * 0.32} color="#1A0810" opacity={0.95} />
      <Circle cx={x} cy={y} r={r * 0.12} color={COLORS.danger} opacity={0.85} />
    </Group>
  );
}
