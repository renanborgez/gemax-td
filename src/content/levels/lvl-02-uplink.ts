import type { LevelDef } from '@/content/types';
import type { TileType } from '@/world/Grid';

const SHORT = (rows: string[]): TileType[][] =>
  rows.map((r) => Array.from(r).map((c) =>
    c === 'P' ? 'path' : c === 'B' ? 'buildable' : 'blocked'
  ) as TileType[]);

// 8 cols, 18 rows. Taller-than-wide map to exercise vertical pan/zoom.
const grid = SHORT([
  // 01234567
  'PPPPPPBB',
  'BBBBBPBB',
  'BBBBBPBB',
  'BBBBBPBB',
  'BBBBBPBB',
  'BPPPPPBB',
  'BPBBBBBB',
  'BPBBBBBB',
  'BPBBBBBB',
  'BPBBBBBB',
  'BPBBBBBB',
  'BPPPPPPB',
  'BBBBBBPB',
  'BBBBBBPB',
  'BBBBBBPB',
  'BBBBBBPB',
  'BBBBBBPB',
  'BBBBBBPB',
]);

const path = [
  { col: 0, row: 0 }, { col: 5, row: 0 }, { col: 5, row: 5 },
  { col: 1, row: 5 }, { col: 1, row: 11 }, { col: 6, row: 11 },
  { col: 6, row: 17 },
];

export const LVL_02_UPLINK: LevelDef = {
  id: 'lvl-02-uplink',
  name: 'Uplink',
  chapter: 1,
  unlockRequires: 'lvl-01-intranet',
  grid: { cols: 8, rows: 18, cells: grid },
  spawners: [{ id: 'main', tile: { col: 0, row: 0 } }],
  path,
  startCredits: 120,
  startLives: 10,
  starThresholds: { stars3: 9, stars2: 6, stars1: 1 },
  waves: [
    { delayBeforeStart: 6, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'worm', count: 8, spacing: 0.7, delay: 0 },
    ]},
    { delayBeforeStart: 8, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'worm',   count: 12, spacing: 0.5, delay: 0 },
      { id: 'g2', spawnerId: 'main', enemyKind: 'trojan', count: 4,  spacing: 1.0, delay: 4 },
    ]},
    { delayBeforeStart: 10, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'trojan', count: 6, spacing: 0.8, delay: 0 },
      { id: 'g2', spawnerId: 'main', enemyKind: 'daemon', count: 3, spacing: 1.4, delay: 5 },
    ]},
  ],
};
