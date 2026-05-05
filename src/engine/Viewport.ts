import { type Vec2 } from '@/lib/vec2';
import { type GridCoord } from '@/lib/types';
import { clamp } from '@/lib/lerp';

export type ViewportOptions = {
  canvasWidthPx: number;
  canvasHeightPx: number;
  gridCols: number;
  gridRows: number;
  canvasOriginScreen: Vec2;       // top-left of <Canvas> in screen coords
  dpr: number;
};

export class Viewport {
  readonly canvasWidthPx: number;
  readonly canvasHeightPx: number;
  readonly gridCols: number;
  readonly gridRows: number;
  readonly canvasOriginScreen: Vec2;
  readonly dpr: number;
  readonly tileSize: number;
  readonly mapWidthPx: number;
  readonly mapHeightPx: number;
  /** Default pan offsets that center the map within the canvas at zoom=1. */
  readonly defaultPanX: number;
  readonly defaultPanY: number;

  constructor(opts: ViewportOptions) {
    this.canvasWidthPx = opts.canvasWidthPx;
    this.canvasHeightPx = opts.canvasHeightPx;
    this.gridCols = opts.gridCols;
    this.gridRows = opts.gridRows;
    this.canvasOriginScreen = opts.canvasOriginScreen;
    this.dpr = opts.dpr;
    // Square tiles sized to fill canvas width. Levels are taller-than-wide,
    // so vertical overflow is expected and handled by pan/zoom. Picking
    // width-only (instead of min(w,h)) stretches the grid edge-to-edge
    // horizontally and avoids letterboxing on the sides.
    this.tileSize = opts.canvasWidthPx / opts.gridCols;
    this.mapWidthPx = this.tileSize * opts.gridCols;
    this.mapHeightPx = this.tileSize * opts.gridRows;
    this.defaultPanX = (opts.canvasWidthPx - this.mapWidthPx) / 2;
    this.defaultPanY = (opts.canvasHeightPx - this.mapHeightPx) / 2;
  }

  gridToWorld(g: GridCoord): Vec2 {
    return {
      x: g.col * this.tileSize + this.tileSize / 2,
      y: g.row * this.tileSize + this.tileSize / 2,
    };
  }

  worldToGrid(w: Vec2): GridCoord {
    return {
      col: clamp(Math.floor(w.x / this.tileSize), 0, this.gridCols - 1),
      row: clamp(Math.floor(w.y / this.tileSize), 0, this.gridRows - 1),
    };
  }

  screenToWorld(s: Vec2): Vec2 {
    return { x: s.x - this.canvasOriginScreen.x, y: s.y - this.canvasOriginScreen.y };
  }

  worldToScreen(w: Vec2): Vec2 {
    return { x: w.x + this.canvasOriginScreen.x, y: w.y + this.canvasOriginScreen.y };
  }
}
