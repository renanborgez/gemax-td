import React from 'react';
import { Circle, Group, Path as SkPath, RoundedRect, Skia } from '@shopify/react-native-skia';
import type { Viewport } from '@/engine/Viewport';
import type { World } from '@/world/World';
import type { ObstacleKind } from '@/content/types';

/**
 * Static, non-placable map decoration. Each obstacle renders a per-kind
 * sprite at the center of its grid tile:
 *   - crate: rounded square, brown/khaki fill with a darker outline
 *   - rocket: upright triangle silhouette with a red nose
 *   - void: dark circle with a faint inner ring
 *
 * Obstacles never move — drawn once per world layout. Sits beneath towers /
 * enemies so they render on top.
 */
export function ObstaclesLayer({ world, viewport }: { world: World; viewport: Viewport }) {
  const obstacles = world.level.obstacles;
  if (!obstacles || obstacles.length === 0) return null;
  const tile = viewport.tileSize;
  return (
    <Group>
      {obstacles.map((o, i) => {
        const xy = viewport.gridToWorld({ col: o.col, row: o.row });
        return (
          <Obstacle key={`${o.col}:${o.row}:${i}`} kind={o.kind} x={xy.x} y={xy.y} tile={tile} />
        );
      })}
    </Group>
  );
}

function Obstacle({ kind, x, y, tile }: { kind: ObstacleKind; x: number; y: number; tile: number }) {
  const r = tile * 0.42;
  switch (kind) {
    case 'crate':
      return (
        <Group>
          <RoundedRect
            x={x - r}
            y={y - r}
            width={r * 2}
            height={r * 2}
            r={r * 0.18}
            color="#8A6A3A"
            opacity={0.95}
          />
          <RoundedRect
            x={x - r}
            y={y - r}
            width={r * 2}
            height={r * 2}
            r={r * 0.18}
            color="#3D2A14"
            style="stroke"
            strokeWidth={Math.max(1, tile * 0.04)}
          />
          <RoundedRect
            x={x - r * 0.6}
            y={y - r * 0.12}
            width={r * 1.2}
            height={r * 0.24}
            r={r * 0.06}
            color="#3D2A14"
            opacity={0.6}
          />
        </Group>
      );
    case 'rocket': {
      const path = Skia.Path.Make();
      path.moveTo(x, y - r);
      path.lineTo(x + r * 0.7, y + r * 0.6);
      path.lineTo(x + r * 0.35, y + r * 0.6);
      path.lineTo(x + r * 0.5, y + r);
      path.lineTo(x - r * 0.5, y + r);
      path.lineTo(x - r * 0.35, y + r * 0.6);
      path.lineTo(x - r * 0.7, y + r * 0.6);
      path.close();
      return (
        <Group>
          <SkPath path={path} color="#C9CED6" />
          <SkPath path={path} color="#1A1F2A" style="stroke" strokeWidth={Math.max(1, tile * 0.04)} />
          <Circle cx={x} cy={y - r * 0.3} r={r * 0.18} color="#E04A3C" />
          <Circle cx={x} cy={y + r * 0.85} r={r * 0.12} color="#FFB347" opacity={0.9} />
        </Group>
      );
    }
    case 'void':
      return (
        <Group>
          <Circle cx={x} cy={y} r={r * 1.05} color="#000000" opacity={0.85} />
          <Circle
            cx={x}
            cy={y}
            r={r * 0.95}
            color="#5B3A8C"
            opacity={0.6}
            style="stroke"
            strokeWidth={Math.max(1, tile * 0.04)}
          />
          <Circle cx={x} cy={y} r={r * 0.45} color="#9A6BFF" opacity={0.35} />
          <Circle cx={x} cy={y} r={r * 0.18} color="#FFFFFF" opacity={0.8} />
        </Group>
      );
  }
}
