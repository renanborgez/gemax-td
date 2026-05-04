import { type GridCoord } from '@/lib/types';

export type TileType = 'path' | 'buildable' | 'blocked';

export type GridSpec = {
  cols: number;
  rows: number;
  cells: TileType[][];     // [row][col]
};

export class BuildGrid {
  readonly cols: number;
  readonly rows: number;
  private cells: TileType[][];
  private occupants: Map<string, string> = new Map(); // "col,row" -> towerId

  constructor(spec: GridSpec) {
    if (spec.cells.length !== spec.rows) throw new Error('cells.length !== rows');
    for (const row of spec.cells) {
      if (row.length !== spec.cols) throw new Error('row.length !== cols');
    }
    this.cols = spec.cols;
    this.rows = spec.rows;
    this.cells = spec.cells.map((r) => r.slice());
  }

  private inBounds(g: GridCoord): boolean {
    return g.col >= 0 && g.col < this.cols && g.row >= 0 && g.row < this.rows;
  }

  private key(g: GridCoord): string { return `${g.col},${g.row}`; }

  tileAt(g: GridCoord): TileType | null {
    if (!this.inBounds(g)) return null;
    return this.cells[g.row]![g.col]!;
  }

  canBuild(g: GridCoord): boolean {
    if (!this.inBounds(g)) return false;
    if (this.cells[g.row]![g.col]! !== 'buildable') return false;
    return !this.occupants.has(this.key(g));
  }

  occupy(g: GridCoord, towerId: string): void {
    if (!this.canBuild(g)) throw new Error(`cannot occupy ${this.key(g)}`);
    this.occupants.set(this.key(g), towerId);
  }

  vacate(g: GridCoord): void {
    this.occupants.delete(this.key(g));
  }

  occupantAt(g: GridCoord): string | undefined {
    return this.occupants.get(this.key(g));
  }
}
