import React, { useMemo } from 'react';
import { Group, Circle, Path } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { Viewport } from '@/engine/Viewport';
import type { WorldSnapshot } from '@/render/snapshot';
import { COLORS } from '@/render/theme';
import {
  TOWER_ICON_KINDS,
  TOWER_ICON_COLORS,
  makeTowerIconPath,
} from '@/render/towerIcons';
import type { TowerKind } from '@/content/types';

const MAX_TOWERS = 80;

export function TowersLayer({
  viewport, snapshot,
}: { viewport: Viewport; snapshot: SharedValue<WorldSnapshot> }) {
  const tileSize = viewport.tileSize;
  // Bake one Skia path per tower kind, sized to the tower's drawing area.
  // Memoized on tileSize (stable for the world's lifetime).
  const iconPaths = useMemo(() => {
    const iconSize = tileSize * 0.62;
    return Object.fromEntries(
      TOWER_ICON_KINDS.map((k) => [k, makeTowerIconPath(k, iconSize)]),
    ) as Record<TowerKind, ReturnType<typeof makeTowerIconPath>>;
  }, [tileSize]);

  return (
    <Group>
      {Array.from({ length: MAX_TOWERS }, (_, i) => (
        <TowerSlot key={i} index={i} snapshot={snapshot} viewport={viewport} iconPaths={iconPaths} />
      ))}
    </Group>
  );
}

function TowerSlot({
  index, snapshot, viewport, iconPaths,
}: {
  index: number;
  snapshot: SharedValue<WorldSnapshot>;
  viewport: Viewport;
  iconPaths: Record<TowerKind, ReturnType<typeof makeTowerIconPath>>;
}) {
  const tileSize = viewport.tileSize;
  const r = tileSize * 0.36;
  const cx = useDerivedValue(() => (snapshot.value.towers[index]?.x ?? -1000) * tileSize);
  const cy = useDerivedValue(() => (snapshot.value.towers[index]?.y ?? -1000) * tileSize);
  const opacity = useDerivedValue(() => (index < snapshot.value.towers.length ? 1 : 0));
  const transform = useDerivedValue(() => [
    { translateX: cx.value },
    { translateY: cy.value },
  ]);
  return (
    <Group opacity={opacity}>
      <Circle cx={cx} cy={cy} r={r} color={COLORS.cyan} opacity={0.18} />
      <Circle cx={cx} cy={cy} r={r * 0.7} color={COLORS.cyan} opacity={0.5} />
      <Group transform={transform}>
        {TOWER_ICON_KINDS.map((kind) => (
          <TowerIconGlyph
            key={kind}
            kind={kind}
            index={index}
            snapshot={snapshot}
            path={iconPaths[kind]}
            strokeWidth={Math.max(1.2, tileSize * 0.04)}
          />
        ))}
      </Group>
    </Group>
  );
}

function TowerIconGlyph({
  kind, index, snapshot, path, strokeWidth,
}: {
  kind: TowerKind;
  index: number;
  snapshot: SharedValue<WorldSnapshot>;
  path: ReturnType<typeof makeTowerIconPath>;
  strokeWidth: number;
}) {
  const visible = useDerivedValue(() =>
    snapshot.value.towers[index]?.defKind === kind ? 1 : 0,
  );
  return (
    <Path
      path={path}
      style="stroke"
      strokeWidth={strokeWidth}
      strokeJoin="round"
      strokeCap="round"
      color={TOWER_ICON_COLORS[kind]}
      opacity={visible}
    />
  );
}
