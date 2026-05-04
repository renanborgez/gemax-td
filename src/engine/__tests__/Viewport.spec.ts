import { describe, it, expect } from 'vitest';
import { Viewport } from '@/engine/Viewport';

describe('Viewport', () => {
  const vp = new Viewport({
    canvasWidthPx: 360,
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
    expect(vp.tileSize).toBe(40);    // 360 / 9
  });

  it('clamps grid coords to bounds in worldToGrid', () => {
    expect(vp.worldToGrid({ x: -5, y: -5 })).toEqual({ col: 0, row: 0 });
    expect(vp.worldToGrid({ x: 99999, y: 99999 })).toEqual({ col: 8, row: 17 });
  });

  it('fit-to-view: tall map fits to width on landscape canvas', () => {
    // 800w × 400h canvas, 10 cols × 20 rows map → height-bound.
    const tall = new Viewport({
      canvasWidthPx: 800, canvasHeightPx: 400,
      gridCols: 10, gridRows: 20,
      canvasOriginScreen: { x: 0, y: 0 }, dpr: 1,
    });
    expect(tall.tileSize).toBe(20);                  // min(80, 20)
    expect(tall.mapWidthPx).toBe(200);
    expect(tall.mapHeightPx).toBe(400);
    expect(tall.defaultPanX).toBe(300);              // (800 - 200) / 2
    expect(tall.defaultPanY).toBe(0);
  });

  it('fit-to-view: wide map fits to height on portrait canvas', () => {
    // 400w × 800h canvas, 16 cols × 10 rows map → width-bound.
    const wide = new Viewport({
      canvasWidthPx: 400, canvasHeightPx: 800,
      gridCols: 16, gridRows: 10,
      canvasOriginScreen: { x: 0, y: 0 }, dpr: 1,
    });
    expect(wide.tileSize).toBe(25);                  // min(25, 80)
    expect(wide.mapWidthPx).toBe(400);
    expect(wide.mapHeightPx).toBe(250);
    expect(wide.defaultPanX).toBe(0);
    expect(wide.defaultPanY).toBe(275);              // (800 - 250) / 2
  });
});
