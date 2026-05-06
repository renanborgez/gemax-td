import { type Vec2 } from '@/lib/vec2';
import { type GridCoord } from '@/lib/types';
import { clamp } from '@/lib/lerp';

/** Empty rows of breathing room rendered above grid row 0 (spawn area). */
export const TOP_PADDING_ROWS = 1.2;
/** Empty rows of breathing room rendered below the last grid row (base area). */
export const BOTTOM_PADDING_ROWS = 2;
/** Horizontal canvas margin so spawn/base bubbles at col 0 / last col aren't clipped by canvas edge. */
export const HORIZONTAL_MARGIN_PX = 12;

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
  /** Top-of-canvas blank space above grid row 0 at zoom=1. */
  readonly topPaddingPx: number;
  /** Bottom-of-canvas blank space below the final grid row at zoom=1. */
  readonly bottomPaddingPx: number;
  /** Default pan offsets — top-anchored with padding so the spawn row is visible from the start. */
  readonly defaultPanX: number;
  readonly defaultPanY: number;

  constructor(opts: ViewportOptions) {
    this.canvasWidthPx = opts.canvasWidthPx;
    this.canvasHeightPx = opts.canvasHeightPx;
    this.gridCols = opts.gridCols;
    this.gridRows = opts.gridRows;
    this.canvasOriginScreen = opts.canvasOriginScreen;
    this.dpr = opts.dpr;
    // Square tiles sized to fill canvas width minus a horizontal margin so
    // bubbles/AOE indicators at col 0 and the last col aren't clipped by the
    // canvas edge. Levels are taller-than-wide, so vertical overflow is
    // expected and handled by pan/zoom.
    this.tileSize = Math.max(1, (opts.canvasWidthPx - HORIZONTAL_MARGIN_PX * 2) / opts.gridCols);
    this.mapWidthPx = this.tileSize * opts.gridCols;
    this.mapHeightPx = this.tileSize * opts.gridRows;
    this.topPaddingPx = TOP_PADDING_ROWS * this.tileSize;
    this.bottomPaddingPx = BOTTOM_PADDING_ROWS * this.tileSize;
    this.defaultPanX = (opts.canvasWidthPx - this.mapWidthPx) / 2;
    this.defaultPanY = this.topPaddingPx;
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
