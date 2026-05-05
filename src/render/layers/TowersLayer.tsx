import React, { useEffect, useMemo, useReducer } from 'react';
import { Group, Circle, Path } from '@shopify/react-native-skia';
import type { Viewport } from '@/engine/Viewport';
import type { World } from '@/world/World';
import { snapshotTowers, type TowerSnap } from '@/render/snapshot';
import { COLORS } from '@/render/theme';
import {
  TOWER_ICON_COLORS,
  makeTowerIconPath,
} from '@/render/towerIcons';
import type { TowerKind } from '@/content/types';

/**
 * Towers don't move, so render them via plain React props instead of pre-allocated
 * worklet slots. Re-render only when the tower list changes (place / sell / upgrade).
 * This drops ~80×9 useDerivedValue worklets that previously fired every frame.
 */
export function TowersLayer({
  viewport, worldRef,
}: { viewport: Viewport; worldRef: { current: World } }) {
  const [, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const w = worldRef.current;
    const offs = [
      w.bus.on('tower-placed', bump),
      w.bus.on('tower-sold', bump),
      w.bus.on('tower-upgraded', bump),
    ];
    return () => { for (const off of offs) off(); };
  }, [worldRef]);

  const towers: TowerSnap[] = snapshotTowers(worldRef.current);

  const tileSize = viewport.tileSize;
  const iconSize = tileSize * 0.62;
  const r = tileSize * 0.36;
  const strokeWidth = Math.max(1.2, tileSize * 0.04);

  return (
    <Group>
      {towers.map((t) => (
        <TowerNode
          key={t.id}
          tower={t}
          tileSize={tileSize}
          iconSize={iconSize}
          r={r}
          strokeWidth={strokeWidth}
        />
      ))}
    </Group>
  );
}

function TowerNode({
  tower, tileSize, iconSize, r, strokeWidth,
}: {
  tower: TowerSnap;
  tileSize: number;
  iconSize: number;
  r: number;
  strokeWidth: number;
}) {
  const cx = tower.x * tileSize;
  const cy = tower.y * tileSize;
  const kind = tower.defKind as TowerKind;
  const path = useMemo(() => makeTowerIconPath(kind, iconSize), [kind, iconSize]);
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={r} color={COLORS.cyan} opacity={0.18} />
      <Circle cx={cx} cy={cy} r={r * 0.7} color={COLORS.cyan} opacity={0.5} />
      <Path
        path={path}
        transform={[{ translateX: cx }, { translateY: cy }]}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeJoin="round"
        strokeCap="round"
        color={TOWER_ICON_COLORS[kind]}
      />
    </Group>
  );
}
