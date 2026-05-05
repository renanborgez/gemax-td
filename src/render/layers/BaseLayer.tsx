import React, { useEffect } from 'react';
import { Circle, Group, RoundedRect } from '@shopify/react-native-skia';
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
 * The Core — visual marker at the path's terminus that the player is
 * defending. Mint diamond inside concentric rings; sits under the towers /
 * enemies layers so leaking enemies render on top of it.
 */
export function BaseLayer({ world, viewport }: { world: World; viewport: Viewport }) {
  const pts = world.level.path;
  const last = pts[pts.length - 1];
  const tile = viewport.tileSize;
  const r = tile * 0.5;
  const stroke = Math.max(1.2, tile * 0.05);
  const diamondSide = r * 0.95;

  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [pulse]);

  const haloR = useDerivedValue(() => r * (1.45 + pulse.value * 0.35));
  const haloOpacity = useDerivedValue(() => 0.04 + pulse.value * 0.16);
  const ringR = useDerivedValue(() => r * (1.05 + pulse.value * 0.08));
  const ringOpacity = useDerivedValue(() => 0.4 + pulse.value * 0.4);
  const coreOpacity = useDerivedValue(() => 0.6 + pulse.value * 0.4);

  if (!last) return null;
  const { x, y } = viewport.gridToWorld(last);

  return (
    <Group>
      <Circle cx={x} cy={y} r={haloR} color={COLORS.secondary} opacity={haloOpacity} />
      <Circle cx={x} cy={y} r={r * 1.1} color={COLORS.secondary} opacity={0.18} />
      <Circle
        cx={x}
        cy={y}
        r={ringR}
        color={COLORS.secondary}
        opacity={ringOpacity}
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
      <Circle cx={x} cy={y} r={r * 0.18} color="#FFFFFF" opacity={coreOpacity} />
    </Group>
  );
}
