import React from 'react';
import { Group, Circle, Rect } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { World } from '@/world/World';
import type { Viewport } from '@/engine/Viewport';
import { COLORS } from '@/render/theme';

const MAX_TOWERS = 80;

type TowerSnapshot = { x: number; y: number; defKind: string; level: number };

export function TowersLayer({
  world, viewport, redrawTick,
}: { world: World; viewport: Viewport; redrawTick: SharedValue<number> }) {
  const snapshot = useDerivedValue<TowerSnapshot[]>(() => {
    redrawTick.value;
    const out: TowerSnapshot[] = [];
    const towers = world.entities.towers;
    for (let i = 0; i < towers.length && i < MAX_TOWERS; i++) {
      const t = towers[i]!;
      out.push({
        x: t.x * viewport.tileSize,
        y: t.y * viewport.tileSize,
        defKind: t.defKind,
        level: t.level,
      });
    }
    return out;
  });

  return (
    <Group>
      {Array.from({ length: MAX_TOWERS }, (_, i) => (
        <TowerSlot key={i} index={i} snapshot={snapshot} viewport={viewport} />
      ))}
    </Group>
  );
}

// Extracted per-slot component so the hooks live at the top level of a real
// component, not inside a loop body. Hooks-in-loop with constant length is
// technically allowed under React's stable-order rule, but extracting keeps
// the lint cleaner.
function TowerSlot({
  index, snapshot, viewport,
}: { index: number; snapshot: SharedValue<TowerSnapshot[]>; viewport: Viewport }) {
  const r = viewport.tileSize * 0.36;
  const cx = useDerivedValue(() => snapshot.value[index]?.x ?? -1000);
  const cy = useDerivedValue(() => snapshot.value[index]?.y ?? -1000);
  const opacity = useDerivedValue(() => (index < snapshot.value.length ? 1 : 0));
  const innerX = useDerivedValue(() => (snapshot.value[index]?.x ?? 0) - r * 0.3);
  const innerY = useDerivedValue(() => (snapshot.value[index]?.y ?? 0) - r * 0.3);
  const color = useDerivedValue(() => {
    const k = snapshot.value[index]?.defKind;
    if (k === 'firewall') return '#00F0FF';
    if (k === 'logic-bomb') return '#FF2BD6';
    if (k === 'ice-lance') return '#7CFF6B';
    return '#888';
  });
  return (
    <Group opacity={opacity}>
      <Circle cx={cx} cy={cy} r={r} color={COLORS.cyan} opacity={0.18} />
      <Circle cx={cx} cy={cy} r={r * 0.7} color={COLORS.cyan} opacity={0.5} />
      <Rect x={innerX} y={innerY} width={r * 0.6} height={r * 0.6} color={color} />
    </Group>
  );
}
