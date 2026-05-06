import React, { useEffect } from 'react';
import { Circle, Group } from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { Viewport } from '@/engine/Viewport';
import type { World } from '@/world/World';
import { COLORS } from '@/render/theme';

/**
 * Spawn portal — dark-red marker at each spawner tile where enemies emerge.
 * Concentric rings with a deep void at the center; sits below towers/enemies
 * so spawning units render on top. Multi-lane levels render one portal per
 * unique spawner tile.
 */
export function SpawnLayer({ world, viewport }: { world: World; viewport: Viewport }) {
  const spawners = world.level.spawners;
  const tile = viewport.tileSize;
  const r = tile * 0.5;
  const stroke = Math.max(1.2, tile * 0.05);

  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [pulse]);

  const haloR = useDerivedValue(() => r * (1.45 + pulse.value * 0.35));
  const haloOpacity = useDerivedValue(() => 0.05 + pulse.value * 0.18);
  const ringR = useDerivedValue(() => r * (1.05 + pulse.value * 0.08));
  const ringOpacity = useDerivedValue(() => 0.45 + pulse.value * 0.45);
  const coreOpacity = useDerivedValue(() => 0.6 + pulse.value * 0.4);

  if (spawners.length === 0) return null;

  // Dedupe by tile (col,row) so two spawners sharing an entry don't double-paint.
  const seen = new Set<string>();
  const tiles: { x: number; y: number; key: string }[] = [];
  for (const s of spawners) {
    const k = `${s.tile.col}:${s.tile.row}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const xy = viewport.gridToWorld(s.tile);
    tiles.push({ x: xy.x, y: xy.y, key: k });
  }

  return (
    <Group>
      {tiles.map(({ x, y, key }) => (
        <Group key={key}>
          <Circle cx={x} cy={y} r={haloR} color={COLORS.danger} opacity={haloOpacity} />
          <Circle cx={x} cy={y} r={r * 1.1} color={COLORS.danger} opacity={0.22} />
          <Circle
            cx={x}
            cy={y}
            r={ringR}
            color={COLORS.danger}
            opacity={ringOpacity}
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
          <Circle cx={x} cy={y} r={r * 0.12} color={COLORS.danger} opacity={coreOpacity} />
        </Group>
      ))}
    </Group>
  );
}
