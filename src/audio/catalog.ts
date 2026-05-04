// SFX keys are content-addressed and synthesized at runtime — see specs.ts and bake.ts.
// Music sources still point to a silent placeholder; music generation is out of scope.
const silent = require('./assets/silent-100ms.wav');

export const SFX_KEYS = [
  'tower-fire-firewall',
  'tower-fire-logic-bomb',
  'tower-fire-ice-lance',
  'enemy-hit',
  'enemy-death',
  'wave-start',
  'life-lost',
  'win',
  'lose',
  'ui-click',
  'tower-placed',
] as const;
export type SfxKey = typeof SFX_KEYS[number];

export const MUSIC_SOURCES = {
  'main-menu': silent,
  'in-game':   silent,
} as const;
export type MusicKey = keyof typeof MUSIC_SOURCES;

/** Pool size per SFX. */
export const SFX_POOL_SIZE: Readonly<Record<SfxKey, number>> = {
  'tower-fire-firewall':   4,
  'tower-fire-logic-bomb': 2,
  'tower-fire-ice-lance':  3,
  'enemy-hit':             4,
  'enemy-death':           3,
  'wave-start':            1,
  'life-lost':             1,
  'win':                   1,
  'lose':                  1,
  'ui-click':              2,
  'tower-placed':          2,
};
