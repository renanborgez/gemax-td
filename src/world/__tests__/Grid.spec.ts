import { describe, it, expect } from 'vitest';
import { BuildGrid, TileType } from '@/world/Grid';

const layout: TileType[][] = [
  ['buildable', 'buildable', 'path'],
  ['blocked',   'buildable', 'path'],
  ['buildable', 'buildable', 'path'],
];

describe('BuildGrid', () => {
  it('reports tile type', () => {
    const g = new BuildGrid({ cols: 3, rows: 3, cells: layout });
    expect(g.tileAt({ col: 0, row: 0 })).toBe('buildable');
    expect(g.tileAt({ col: 2, row: 0 })).toBe('path');
    expect(g.tileAt({ col: 0, row: 1 })).toBe('blocked');
  });

  it('canBuild rejects path/blocked/out-of-bounds', () => {
    const g = new BuildGrid({ cols: 3, rows: 3, cells: layout });
    expect(g.canBuild({ col: 0, row: 0 })).toBe(true);
    expect(g.canBuild({ col: 2, row: 0 })).toBe(false);
    expect(g.canBuild({ col: 0, row: 1 })).toBe(false);
    expect(g.canBuild({ col: -1, row: 0 })).toBe(false);
    expect(g.canBuild({ col: 5, row: 5 })).toBe(false);
  });

  it('canBuild rejects already-occupied tiles', () => {
    const g = new BuildGrid({ cols: 3, rows: 3, cells: layout });
    g.occupy({ col: 0, row: 0 }, 'tower:1');
    expect(g.canBuild({ col: 0, row: 0 })).toBe(false);
    expect(g.occupantAt({ col: 0, row: 0 })).toBe('tower:1');
  });

  it('vacate removes the occupant', () => {
    const g = new BuildGrid({ cols: 3, rows: 3, cells: layout });
    g.occupy({ col: 0, row: 0 }, 'tower:1');
    g.vacate({ col: 0, row: 0 });
    expect(g.canBuild({ col: 0, row: 0 })).toBe(true);
  });
});
