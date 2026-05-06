import type { TowerKind } from '@/content/types';

export type ChapterRewards = {
  readonly towerKinds: readonly TowerKind[];
  readonly paletteId: string;
  readonly medalId: string;
};

/**
 * Per-chapter reward bundle. Each chapter clear (all 10 missions on Normal)
 * grants the listed tower listings (still cost shards), the medal (vanity),
 * and the palette (selectable HUD theme).
 *
 * Themed assignment — towers are matched to chapter narrative, not paced math.
 * Chapter 9 (Apex) is the cosmetic-only finale: medal + palette, no tower.
 */
export const CHAPTER_REWARDS: Readonly<Record<number, ChapterRewards>> = {
  0: { towerKinds: ['firewall'],                paletteId: 'palette/intranet',  medalId: 'medal/c0' },
  1: { towerKinds: ['machine-gun', 'marker'],   paletteId: 'palette/uplink',    medalId: 'medal/c1' },
  2: { towerKinds: ['sniper'],                  paletteId: 'palette/cloud',     medalId: 'medal/c2' },
  3: { towerKinds: ['emp', 'tesla-coil'],       paletteId: 'palette/mainframe', medalId: 'medal/c3' },
  4: { towerKinds: ['mortar'],                  paletteId: 'palette/firmware',  medalId: 'medal/c4' },
  5: { towerKinds: ['venom-spire', 'flamer'],   paletteId: 'palette/darknet',   medalId: 'medal/c5' },
  6: { towerKinds: ['ice-lance', 'cryo-field'], paletteId: 'palette/quantum',   medalId: 'medal/c6' },
  7: { towerKinds: ['beam-cannon'],             paletteId: 'palette/logic',     medalId: 'medal/c7' },
  8: { towerKinds: ['plasma-cannon'],           paletteId: 'palette/void',      medalId: 'medal/c8' },
  9: { towerKinds: [],                          paletteId: 'palette/apex',      medalId: 'medal/c9' },
};
