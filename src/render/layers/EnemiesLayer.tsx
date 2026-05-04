import React from 'react';
import { Group, Circle, Rect } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { World } from '@/world/World';
import type { Viewport } from '@/engine/Viewport';
import { COLORS } from '@/render/theme';

const MAX_ENEMIES = 200;

type EnemySnapshot = { x: number; y: number; defKind: string; hp: number; maxHp: number };

export function EnemiesLayer({
  world, viewport, redrawTick,
}: { world: World; viewport: Viewport; redrawTick: SharedValue<number> }) {
  const snapshot = useDerivedValue<EnemySnapshot[]>(() => {
    redrawTick.value;
    const out: EnemySnapshot[] = [];
    const enemies = world.entities.enemies;
    for (let i = 0; i < enemies.length && i < MAX_ENEMIES; i++) {
      const e = enemies[i]!;
      if (!e.alive) continue;
      out.push({
        x: e.x * viewport.tileSize,
        y: e.y * viewport.tileSize,
        defKind: e.defKind,
        hp: e.hp,
        maxHp: e.maxHp,
      });
    }
    return out;
  });

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
}: { index: number; snapshot: SharedValue<EnemySnapshot[]>; viewport: Viewport }) {
  const r = viewport.tileSize * 0.22;
  const cx = useDerivedValue(() => snapshot.value[index]?.x ?? -1000);
  const cy = useDerivedValue(() => snapshot.value[index]?.y ?? -1000);
  const color = useDerivedValue(() => enemyColor(snapshot.value[index]?.defKind));
  const opacity = useDerivedValue(() => (index < snapshot.value.length ? 1 : 0));
  const hpFrac = useDerivedValue(() => {
    const s = snapshot.value[index];
    return s ? Math.max(0, Math.min(1, s.hp / s.maxHp)) : 0;
  });
  const barX = useDerivedValue(() => (snapshot.value[index]?.x ?? 0) - r);
  const barY = useDerivedValue(() => (snapshot.value[index]?.y ?? 0) - r * 1.6);
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
  switch (defKind) {
    case 'worm': return '#7CFF6B';
    case 'trojan': return '#FFB347';
    case 'daemon': return '#FF2BD6';
    case 'rootkit': return '#FF2BD6';
    default: return '#888';
  }
}
