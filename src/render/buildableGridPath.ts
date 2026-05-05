import { Skia, type SkPath } from '@shopify/react-native-skia';
import type { BuildGrid } from '@/world/Grid';

/**
 * Build a single SkPath that outlines every buildable cell in the grid. Used
 * by GridOverlayLayer to render an always-visible "you can place here" hint
 * without spawning a Skia node per cell. Inset slightly so adjacent cells
 * have a visible gutter.
 */
export function makeBuildableOutlinePath(grid: BuildGrid, tileSize: number): SkPath {
  const path = Skia.Path.Make();
  const inset = Math.max(1, tileSize * 0.06);
  const r = Math.max(1, tileSize * 0.12);
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      if (grid.tileAt({ col, row }) !== 'buildable') continue;
      const x = col * tileSize + inset;
      const y = row * tileSize + inset;
      const w = tileSize - inset * 2;
      const h = tileSize - inset * 2;
      path.addRRect({ rect: { x, y, width: w, height: h }, rx: r, ry: r });
    }
  }
  return path;
}
