import React, { useMemo } from 'react';
import { Path, Skia } from '@shopify/react-native-skia';
import type { Viewport } from '@/engine/Viewport';
import type { World } from '@/world/World';
import { COLORS } from '@/render/theme';
import type { TowerKind } from '@/content/types';
import { TOWER_ICON_COLORS } from '@/render/towerIcons';

// Outline of every buildable tile. Always rendered as a faint grid hint so the
// playfield reads as a placement surface even outside placement mode; the
// outlines tint and brighten when the user is holding a tower to place.
// One Skia Path contains every cell rect and is stroked in a single draw call —
// no per-cell components, no SharedValue subscriptions, no per-frame worklets.
// The path is keyed on grid+tileSize, which only change on canvas resize.
export function BuildableLayer({
  viewport, world, buyKind,
}: {
  viewport: Viewport;
  world: World;
  buyKind: TowerKind | null;
}) {
  const path = useMemo(() => {
    const tile = viewport.tileSize;
    const inset = Math.max(2, tile * 0.08);
    const size = tile - inset * 2;
    const p = Skia.Path.Make();
    const grid = world.grid;
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (grid.canBuild({ col: c, row: r })) {
          p.addRect(Skia.XYWHRect(c * tile + inset, r * tile + inset, size, size));
        }
      }
    }
    return p;
  }, [viewport.tileSize, world]);

  const color = buyKind ? TOWER_ICON_COLORS[buyKind] : COLORS.buildableHint;
  const opacity = buyKind ? 0.35 : 0.12;
  const stroke = Math.max(1, viewport.tileSize * 0.03);
  return (
    <Path
      path={path}
      color={color}
      style="stroke"
      strokeWidth={stroke}
      opacity={opacity}
    />
  );
}
