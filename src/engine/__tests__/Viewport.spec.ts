import { describe, it, expect } from 'vitest';
import { Viewport } from '@/engine/Viewport';

describe('Viewport', () => {
  // Test viewport sized so HORIZONTAL_MARGIN_PX (12) cleanly subtracts:
  // (360 - 24) / 9 wouldn't be integer, so use a width that does.
  // 384w → (384 - 24) / 9 = 40 tile.
  const vp = new Viewport({
    canvasWidthPx: 384,
    canvasHeightPx: 720,
    gridCols: 9,
    gridRows: 18,
    canvasOriginScreen: { x: 0, y: 80 },
    dpr: 2,
  });

  it('grid → world (canvas px)', () => {
    expect(vp.gridToWorld({ col: 0, row: 0 })).toEqual({ x: 20, y: 20 });   // tile center: tileSize/2 = 40/2
    expect(vp.gridToWorld({ col: 1, row: 1 })).toEqual({ x: 60, y: 60 });
  });

  it('world → grid', () => {
    expect(vp.worldToGrid({ x: 20, y: 20 })).toEqual({ col: 0, row: 0 });
    expect(vp.worldToGrid({ x: 79, y: 79 })).toEqual({ col: 1, row: 1 });
  });

  it('screen → world removes canvas origin', () => {
    expect(vp.screenToWorld({ x: 100, y: 180 })).toEqual({ x: 100, y: 100 });
  });

  it('world → screen adds canvas origin', () => {
    expect(vp.worldToScreen({ x: 100, y: 100 })).toEqual({ x: 100, y: 180 });
  });

  it('reports tile size', () => {
    expect(vp.tileSize).toBe(40);    // (384 - 24) / 9
  });

  it('clamps grid coords to bounds in worldToGrid', () => {
    expect(vp.worldToGrid({ x: -5, y: -5 })).toEqual({ col: 0, row: 0 });
    expect(vp.worldToGrid({ x: 99999, y: 99999 })).toEqual({ col: 8, row: 17 });
  });

  it('fit-to-width: tall map top-anchors with row padding above spawn', () => {
    // 824w × 400h canvas, 10 cols × 20 rows map → (824 - 24) / 10 = 80.
    const tall = new Viewport({
      canvasWidthPx: 824, canvasHeightPx: 400,
      gridCols: 10, gridRows: 20,
      canvasOriginScreen: { x: 0, y: 0 }, dpr: 1,
    });
    expect(tall.tileSize).toBe(80);                  // (824 - 24) / 10
    expect(tall.mapWidthPx).toBe(800);
    expect(tall.mapHeightPx).toBe(1600);
    expect(tall.topPaddingPx).toBe(96);              // 1.2 rows × 80
    expect(tall.bottomPaddingPx).toBe(160);          // 2 rows × 80
    expect(tall.defaultPanX).toBe(12);               // (824 - 800) / 2
    expect(tall.defaultPanY).toBe(96);               // top-anchored with 1.2-row padding
  });

  it('fit-to-width: short map also top-anchors with row padding', () => {
    // 424w × 800h canvas, 16 cols × 10 rows map → (424 - 24) / 16 = 25.
    const wide = new Viewport({
      canvasWidthPx: 424, canvasHeightPx: 800,
      gridCols: 16, gridRows: 10,
      canvasOriginScreen: { x: 0, y: 0 }, dpr: 1,
    });
    expect(wide.tileSize).toBe(25);                  // (424 - 24) / 16
    expect(wide.mapWidthPx).toBe(400);
    expect(wide.mapHeightPx).toBe(250);
    expect(wide.topPaddingPx).toBe(30);              // 1.2 rows × 25
    expect(wide.bottomPaddingPx).toBe(50);           // 2 rows × 25
    expect(wide.defaultPanX).toBe(12);               // (424 - 400) / 2
    expect(wide.defaultPanY).toBe(30);               // top-anchored with 1.2-row padding
  });
});
