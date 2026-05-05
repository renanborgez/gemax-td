import React from 'react';
import { Circle, Group, RoundedRect } from '@shopify/react-native-skia';
import type { Viewport } from '@/engine/Viewport';
import type { World } from '@/world/World';
import { COLORS } from '@/render/theme';

/**
 * The Core — visual marker at the path's terminus that the player is
 * defending. Mint diamond inside concentric rings; sits under the towers /
 * enemies layers so leaking enemies render on top of it.
 */
export function BaseLayer({ world, viewport }: { world: World; viewport: Viewport }) {
  const pts = world.level.path;
  if (pts.length === 0) return null;
  const last = pts[pts.length - 1]!;
  const { x, y } = viewport.gridToWorld(last);
  const tile = viewport.tileSize;
  const r = tile * 0.5;
  const stroke = Math.max(1.2, tile * 0.05);
  const diamondSide = r * 0.95;

  return (
    <Group>
      <Circle cx={x} cy={y} r={r * 1.45} color={COLORS.secondary} opacity={0.08} />
      <Circle cx={x} cy={y} r={r * 1.1} color={COLORS.secondary} opacity={0.18} />
      <Circle
        cx={x}
        cy={y}
        r={r * 1.05}
        color={COLORS.secondary}
        opacity={0.55}
        style="stroke"
        strokeWidth={stroke}
      />
      <Circle cx={x} cy={y} r={r * 0.78} color={COLORS.secondarySoft} />
      <Group origin={{ x, y }} transform={[{ rotate: Math.PI / 4 }]}>
        <RoundedRect
          x={x - diamondSide / 2}
          y={y - diamondSide / 2}
          width={diamondSide}
          height={diamondSide}
          r={diamondSide * 0.18}
          color={COLORS.secondary}
          opacity={0.85}
        />
      </Group>
      <Circle cx={x} cy={y} r={r * 0.18} color="#FFFFFF" opacity={0.95} />
    </Group>
  );
}
