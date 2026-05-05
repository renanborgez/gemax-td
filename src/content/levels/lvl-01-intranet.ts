import type { LevelDef } from '@/content/types';
import type { TileType } from '@/world/Grid';

const SHORT = (rows: string[]): TileType[][] =>
  rows.map((r) => Array.from(r).map((c) =>
    c === 'P' ? 'path' : c === 'B' ? 'buildable' : 'blocked'
  ) as TileType[]);

// 8 cols, 16 rows. Path enters top-left, snakes down.
const grid = SHORT([
  // 01234567
  'PPPPPBBB',
  'XXXXPBBB',
  'BBBBPBBB',
  'BBBBPBBB',
  'BBBBPPPP',
  'BBBBBBBP',
  'BBBBBBBP',
  'PPPPPPPP',
  'PBBBBBBB',
  'PBBBBBBB',
  'PBBBBBBB',
  'PPPPPPBB',
  'BBBBBPBB',
  'BBBBBPBB',
  'BBBBBPBB',
  'BBBBBPBB',
]);

const path = [
  { col: 0, row: 0 }, { col: 4, row: 0 }, { col: 4, row: 4 },
  { col: 7, row: 4 }, { col: 7, row: 7 }, { col: 0, row: 7 },
  { col: 0, row: 11 }, { col: 5, row: 11 }, { col: 5, row: 15 },
];

export const LVL_01_INTRANET: LevelDef = {
  id: 'lvl-01-intranet',
  name: 'Intranet',
  chapter: 0,
  grid: { cols: 8, rows: 16, cells: grid },
  spawners: [{ id: 'main', tile: { col: 0, row: 0 } }],
  path,
  startCredits: 100,
  startLives: 10,
  starThresholds: { stars3: 9, stars2: 6, stars1: 1 },
  waves: [
    // Wave 1: gentle worms
    { delayBeforeStart: 6, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'worm', count: 6, spacing: 0.8, delay: 0 },
    ]},
    // Wave 2: more worms
    { delayBeforeStart: 6, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'worm', count: 10, spacing: 0.6, delay: 0 },
    ]},
    // Wave 3: introduce trojans
    { delayBeforeStart: 8, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'worm',   count: 8, spacing: 0.6, delay: 0 },
      { id: 'g2', spawnerId: 'main', enemyKind: 'trojan', count: 3, spacing: 1.2, delay: 0, afterGroupId: 'g1' },
    ]},
    // Wave 4: mixed
    { delayBeforeStart: 8, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'worm',   count: 12, spacing: 0.5, delay: 0 },
      { id: 'g2', spawnerId: 'main', enemyKind: 'trojan', count: 5,  spacing: 1.0, delay: 3 },
    ]},
    // Wave 5: introduce daemon
    { delayBeforeStart: 10, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'trojan', count: 6, spacing: 0.9, delay: 0 },
      { id: 'g2', spawnerId: 'main', enemyKind: 'daemon', count: 2, spacing: 1.5, delay: 4 },
    ]},
    // Wave 6: rush
    { delayBeforeStart: 8, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'worm',   count: 18, spacing: 0.35, delay: 0 },
      { id: 'g2', spawnerId: 'main', enemyKind: 'trojan', count: 4,  spacing: 0.8,  delay: 5 },
    ]},
    // Wave 7: mixed harder
    { delayBeforeStart: 10, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'trojan', count: 6, spacing: 0.7, delay: 0 },
      { id: 'g2', spawnerId: 'main', enemyKind: 'daemon', count: 4, spacing: 1.2, delay: 0, afterGroupId: 'g1' },
    ]},
    // Wave 8: pre-boss filler
    { delayBeforeStart: 12, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'worm',   count: 25, spacing: 0.3, delay: 0 },
      { id: 'g2', spawnerId: 'main', enemyKind: 'daemon', count: 5,  spacing: 1.0, delay: 6 },
    ]},
    // Wave 9: hard mixed
    { delayBeforeStart: 12, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'daemon', count: 6, spacing: 1.0, delay: 0 },
      { id: 'g2', spawnerId: 'main', enemyKind: 'trojan', count: 8, spacing: 0.7, delay: 0, afterGroupId: 'g1' },
    ]},
    // Wave 10: boss + adds
    { delayBeforeStart: 15, groups: [
      { id: 'adds', spawnerId: 'main', enemyKind: 'trojan',  count: 8, spacing: 0.6, delay: 0 },
      { id: 'boss', spawnerId: 'main', enemyKind: 'rootkit', count: 1, spacing: 1.0, delay: 5 },
      { id: 'after-boss', spawnerId: 'main', enemyKind: 'worm', count: 12, spacing: 0.4, delay: 0, afterGroupId: 'boss' },
    ]},
  ],
};
