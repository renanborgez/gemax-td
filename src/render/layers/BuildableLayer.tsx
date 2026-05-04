import React, { useMemo } from 'react';
import { Group, Rect, Path } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { Viewport } from '@/engine/Viewport';
import type { WorldSnapshot } from '@/render/snapshot';
import { COLORS } from '@/render/theme';
import type { TowerKind } from '@/content/types';
import { TOWER_ICON_COLORS, makeTowerIconPath } from '@/render/towerIcons';

const MAX_CELLS = 256;

export function BuildableLayer({
  viewport, snapshot, buyKind,
}: {
  viewport: Viewport;
  snapshot: SharedValue<WorldSnapshot>;
  buyKind: TowerKind | null;
}) {
  // Pre-bake the preview icon path once per (kind, tileSize). When no kind is
  // active we omit the icon subtree entirely.
  const iconPath = useMemo(() => {
    if (!buyKind) return null;
    return makeTowerIconPath(buyKind, viewport.tileSize * 0.55);
  }, [buyKind, viewport.tileSize]);
  const iconColor = buyKind ? TOWER_ICON_COLORS[buyKind] : COLORS.cyan;
  const iconStroke = Math.max(1, viewport.tileSize * 0.035);

  return (
    <Group>
      {Array.from({ length: MAX_CELLS }, (_, i) => (
        <BuildableCell
          key={i}
          index={i}
          snapshot={snapshot}
          viewport={viewport}
          iconPath={iconPath}
          iconColor={iconColor}
          iconStroke={iconStroke}
        />
      ))}
    </Group>
  );
}

function BuildableCell({
  index, snapshot, viewport, iconPath, iconColor, iconStroke,
}: {
  index: number;
  snapshot: SharedValue<WorldSnapshot>;
  viewport: Viewport;
  iconPath: ReturnType<typeof makeTowerIconPath> | null;
  iconColor: string;
  iconStroke: number;
}) {
  const tileSize = viewport.tileSize;
  const inset = Math.max(2, tileSize * 0.08);
  const x = useDerivedValue(() => (snapshot.value.buildable[index]?.col ?? -1000) * tileSize + inset);
  const y = useDerivedValue(() => (snapshot.value.buildable[index]?.row ?? -1000) * tileSize + inset);
  const rectOpacity = useDerivedValue(() => (index < snapshot.value.buildable.length ? 0.18 : 0));
  const iconOpacity = useDerivedValue(() => (index < snapshot.value.buildable.length ? 0.45 : 0));
  const iconTransform = useDerivedValue(() => {
    const cell = snapshot.value.buildable[index];
    const cx = cell ? cell.col * tileSize + tileSize / 2 : -10000;
    const cy = cell ? cell.row * tileSize + tileSize / 2 : -10000;
    return [{ translateX: cx }, { translateY: cy }];
  });
  const size = tileSize - inset * 2;
  return (
    <>
      <Rect
        x={x}
        y={y}
        width={size}
        height={size}
        color={COLORS.buildableHint}
        style="stroke"
        strokeWidth={1}
        opacity={rectOpacity}
      />
      {iconPath && (
        <Group transform={iconTransform} opacity={iconOpacity}>
          <Path
            path={iconPath}
            style="stroke"
            strokeWidth={iconStroke}
            strokeJoin="round"
            strokeCap="round"
            color={iconColor}
          />
        </Group>
      )}
    </>
  );
}
