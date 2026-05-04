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
});
