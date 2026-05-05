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
 * Per-upgrade-level visual tint. Level 1 keeps the kind's base color; higher
 * levels swap to a shared tier color so any tower reads its level at a glance.
 */
const LEVEL_RING_COLOR: Record<1 | 2 | 3, string> = {
  1: COLORS.cyan,
  2: COLORS.secondary,
  3: COLORS.tertiary,
};
const LEVEL_ICON_COLOR_OVERRIDE: Record<1 | 2 | 3, string | null> = {
  1: null,
  2: COLORS.secondary,
  3: COLORS.tertiary,
};

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
    // Defer so the React re-render + Skia mount don't share a frame with the
    // simStep / bus.flush that emitted the event. Mounting a new Skia subtree
    // in the same RAF as a busy simStep was producing a visible micro-stall.
    let pending: ReturnType<typeof setTimeout> | null = null;
    const queueBump = () => {
      if (pending !== null) return;
      pending = setTimeout(() => { pending = null; bump(); }, 0);
    };
    const offs = [
      w.bus.on('tower-placed', queueBump),
      w.bus.on('tower-sold', queueBump),
      w.bus.on('tower-upgraded', queueBump),
    ];
    return () => {
      if (pending !== null) clearTimeout(pending);
      for (const off of offs) off();
    };
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
          x={t.x}
          y={t.y}
          defKind={t.defKind as TowerKind}
          level={(t.level as 1 | 2 | 3) ?? 1}
          tileSize={tileSize}
          iconSize={iconSize}
          r={r}
          strokeWidth={strokeWidth}
        />
      ))}
    </Group>
  );
}

const TowerNode = React.memo(TowerNodeImpl);

function TowerNodeImpl({
  x, y, defKind, level, tileSize, iconSize, r, strokeWidth,
}: {
  x: number;
  y: number;
  defKind: TowerKind;
  level: 1 | 2 | 3;
  tileSize: number;
  iconSize: number;
  r: number;
  strokeWidth: number;
}) {
  const cx = x * tileSize;
  const cy = y * tileSize;
  const path = useMemo(() => makeTowerIconPath(defKind, iconSize), [defKind, iconSize]);
  const ringColor = LEVEL_RING_COLOR[level];
  const iconColor = LEVEL_ICON_COLOR_OVERRIDE[level] ?? TOWER_ICON_COLORS[defKind];
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={r} color={ringColor} opacity={0.06} />
      <Circle cx={cx} cy={cy} r={r * 0.7} color={ringColor} opacity={0.18} />
      {level >= 3 && (
        <Circle
          cx={cx} cy={cy} r={r * 1.05}
          color={ringColor}
          style="stroke"
          strokeWidth={Math.max(1.2, strokeWidth * 0.9)}
          opacity={0.85}
        />
      )}
      <Path
        path={path}
        transform={[{ translateX: cx }, { translateY: cy }]}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeJoin="round"
        strokeCap="round"
        color={iconColor}
      />
    </Group>
  );
}
