import React, { useMemo } from 'react';
import { Group, Path, Rect } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { Viewport } from '@/engine/Viewport';
import type { WorldSnapshot } from '@/render/snapshot';
import { COLORS } from '@/render/theme';
import {
  ENEMY_ICON_KINDS,
  ENEMY_ICON_COLORS,
  makeEnemyIconPath,
} from '@/render/enemyIcons';
import type { EnemyKind } from '@/content/types';

// Cap matched to peak concurrent enemies in level wave defs (~25 worms + a
// few of other kinds). 64 leaves plenty of headroom for future content while
// avoiding the worklet storm of the prior 200-slot cap. Each unused slot still
// runs all of its useDerivedValue worklets every frame.
const MAX_ENEMIES = 64;

export function EnemiesLayer({
  viewport, snapshot,
}: { viewport: Viewport; snapshot: SharedValue<WorldSnapshot> }) {
  const tileSize = viewport.tileSize;
  // Bake one Skia path per enemy kind, sized to the enemy's drawing area.
  // Memoized on tileSize (stable for the world's lifetime).
  const iconPaths = useMemo(() => {
    const iconSize = tileSize * 0.6;
    return Object.fromEntries(
      ENEMY_ICON_KINDS.map((k) => [k, makeEnemyIconPath(k, iconSize)]),
    ) as Record<EnemyKind, ReturnType<typeof makeEnemyIconPath>>;
  }, [tileSize]);

  return (
    <Group>
      {Array.from({ length: MAX_ENEMIES }, (_, i) => (
        <EnemySlot key={i} index={i} snapshot={snapshot} viewport={viewport} iconPaths={iconPaths} />
      ))}
    </Group>
  );
}

function EnemySlot({
  index, snapshot, viewport, iconPaths,
}: {
  index: number;
  snapshot: SharedValue<WorldSnapshot>;
  viewport: Viewport;
  iconPaths: Record<EnemyKind, ReturnType<typeof makeEnemyIconPath>>;
}) {
  const tileSize = viewport.tileSize;
  // Half-extent of the icon — used to position the HP bar above the glyph.
  const r = tileSize * 0.3;
  const strokeWidth = Math.max(1.1, tileSize * 0.035);

  // Single derived position+visibility — Skia layers can read the same
  // SharedValue for cx/cy and Group transform without spawning extra worklets.
  const cx = useDerivedValue(() => (snapshot.value.enemies[index]?.x ?? -1000) * tileSize);
  const cy = useDerivedValue(() => (snapshot.value.enemies[index]?.y ?? -1000) * tileSize);
  const opacity = useDerivedValue(() => (index < snapshot.value.enemies.length ? 1 : 0));
  const transform = useDerivedValue(() => [
    { translateX: cx.value },
    { translateY: cy.value },
  ]);
  const hpFrac = useDerivedValue(() => {
    const s = snapshot.value.enemies[index];
    return s ? Math.max(0, Math.min(1, s.hp / s.maxHp)) : 0;
  });
  const barX = useDerivedValue(() => cx.value - r);
  const barY = useDerivedValue(() => cy.value - r * 1.3);
  const fillW = useDerivedValue(() => r * 2 * hpFrac.value);

  return (
    <Group opacity={opacity}>
      <Group transform={transform}>
        {ENEMY_ICON_KINDS.map((kind) => (
          <EnemyIconGlyph
            key={kind}
            kind={kind}
            index={index}
            snapshot={snapshot}
            path={iconPaths[kind]}
            strokeWidth={strokeWidth}
          />
        ))}
      </Group>
      <Rect x={barX} y={barY} width={r * 2} height={3} color={COLORS.enemyHpBg} />
      <Rect x={barX} y={barY} width={fillW} height={3} color={COLORS.enemyHp} />
    </Group>
  );
}

function EnemyIconGlyph({
  kind, index, snapshot, path, strokeWidth,
}: {
  kind: EnemyKind;
  index: number;
  snapshot: SharedValue<WorldSnapshot>;
  path: ReturnType<typeof makeEnemyIconPath>;
  strokeWidth: number;
}) {
  const visible = useDerivedValue(() =>
    snapshot.value.enemies[index]?.defKind === kind ? 1 : 0,
  );
  return (
    <Path
      path={path}
      style="stroke"
      strokeWidth={strokeWidth}
      strokeJoin="round"
      strokeCap="round"
      color={ENEMY_ICON_COLORS[kind]}
      opacity={visible}
    />
  );
}
