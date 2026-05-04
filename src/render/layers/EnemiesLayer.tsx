import React from 'react';
import { Group, Circle, Rect } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { Viewport } from '@/engine/Viewport';
import type { WorldSnapshot } from '@/render/snapshot';
import { COLORS } from '@/render/theme';

const MAX_ENEMIES = 200;

export function EnemiesLayer({
  viewport, snapshot,
}: { viewport: Viewport; snapshot: SharedValue<WorldSnapshot> }) {
  return (
    <Group>
      {Array.from({ length: MAX_ENEMIES }, (_, i) => (
        <EnemySlot key={i} index={i} snapshot={snapshot} viewport={viewport} />
      ))}
    </Group>
  );
}

function EnemySlot({
  index, snapshot, viewport,
}: { index: number; snapshot: SharedValue<WorldSnapshot>; viewport: Viewport }) {
  const tileSize = viewport.tileSize;
  const r = tileSize * 0.22;
  const cx = useDerivedValue(() => (snapshot.value.enemies[index]?.x ?? -1000) * tileSize);
  const cy = useDerivedValue(() => (snapshot.value.enemies[index]?.y ?? -1000) * tileSize);
  const color = useDerivedValue(() => enemyColor(snapshot.value.enemies[index]?.defKind));
  const opacity = useDerivedValue(() => (index < snapshot.value.enemies.length ? 1 : 0));
  const hpFrac = useDerivedValue(() => {
    const s = snapshot.value.enemies[index];
    return s ? Math.max(0, Math.min(1, s.hp / s.maxHp)) : 0;
  });
  const barX = useDerivedValue(() => ((snapshot.value.enemies[index]?.x ?? 0) * tileSize) - r);
  const barY = useDerivedValue(() => ((snapshot.value.enemies[index]?.y ?? 0) * tileSize) - r * 1.6);
  const fillW = useDerivedValue(() => r * 2 * hpFrac.value);

  return (
    <Group opacity={opacity}>
      <Circle cx={cx} cy={cy} r={r} color={color} />
      <Rect x={barX} y={barY} width={r * 2} height={3} color={COLORS.enemyHpBg} />
      <Rect x={barX} y={barY} width={fillW} height={3} color={COLORS.enemyHp} />
    </Group>
  );
}

function enemyColor(defKind?: string): string {
  'worklet';
  switch (defKind) {
    case 'worm': return '#7AFCC9';
    case 'trojan': return '#FFB14E';
    case 'daemon': return '#FF7A8A';
    case 'rootkit': return '#FF7A8A';
    default: return '#8A8F99';
  }
}
