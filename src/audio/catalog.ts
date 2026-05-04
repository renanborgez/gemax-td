// Placeholder silent WAV — replaced by real assets in a later pass.
// Note: plan originally specified silent-100ms.mp3 but ffmpeg wasn't available
// when the project was scaffolded; a 100ms silent PCM WAV is functionally
// equivalent and Expo Audio supports both formats.
const silent = require('./assets/silent-100ms.wav');

export const SFX_SOURCES = {
  'tower-fire-firewall':   silent,
  'tower-fire-logic-bomb': silent,
  'tower-fire-ice-lance':  silent,
  'enemy-hit':             silent,
  'enemy-death':           silent,
  'wave-start':            silent,
  'life-lost':             silent,
  'win':                   silent,
  'lose':                  silent,
  'ui-click':              silent,
  'tower-placed':          silent,
} as const;
export type SfxKey = keyof typeof SFX_SOURCES;

export const MUSIC_SOURCES = {
  'main-menu':  silent,
  'in-game':    silent,
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
