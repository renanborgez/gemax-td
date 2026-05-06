import type { SfxKey, MusicKey } from '@/audio/catalog';
import {
  SAMPLE_RATE, makeRng, osc, noise, applyAdsr, lowpass, mix, pad, gain,
  type Wave, type NoiseColor, type Adsr,
} from '@/audio/synth';

export type OscLayer = {
  kind: 'osc';
  wave: Wave;
  freqStart: number;
  freqEnd?: number;
  duration: number;
  envelope?: Adsr;
  gainDb?: number;
};

export type NoiseLayer = {
  kind: 'noise';
  color: NoiseColor;
  duration: number;
  envelope?: Adsr;
  lowpassHz?: number;
  gainDb?: number;
};

export type SequenceLayer = {
  kind: 'sequence';
  offsets: number[]; // seconds
  layer: OscLayer | NoiseLayer;
};

export type PatternNote = {
  time: number;     // seconds, relative to layer start
  freq: number;
  duration: number; // seconds
  wave: Wave;
  envelope?: Adsr;
  gainDb?: number;
};

export type PatternLayer = {
  kind: 'pattern';
  notes: PatternNote[];
};

export type Layer = OscLayer | NoiseLayer | SequenceLayer | PatternLayer;

export type SoundSpec = {
  totalSec: number;
  layers: Layer[];
};

/** FNV-1a 32-bit over a canonical-JSON form of the spec. Returns 8-char lowercase hex. */
export function specHash(spec: SoundSpec): string {
  const json = canonicalJson(spec);
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJson((value as Record<string, unknown>)[k])).join(',') + '}';
}

export function renderSpec(spec: SoundSpec): Float32Array {
  // Seed an audio-local RNG from the spec's hash so the same spec is byte-identical across runs.
  const seed = parseInt(specHash(spec), 16) >>> 0;
  const rng = makeRng(seed);
  const buffers: Float32Array[] = [];
  for (const layer of spec.layers) collectLayer(layer, 0, buffers, rng);
  const mixed = mix(buffers);
  return pad(mixed, spec.totalSec);
}

function collectLayer(layer: Layer, offsetSec: number, out: Float32Array[], rng: () => number): void {
  if (layer.kind === 'sequence') {
    for (const off of layer.offsets) collectLayer(layer.layer, offsetSec + off, out, rng);
    return;
  }
  if (layer.kind === 'pattern') {
    for (const note of layer.notes) {
      const noteLayer: OscLayer = {
        kind: 'osc', wave: note.wave, freqStart: note.freq, duration: note.duration,
        ...(note.envelope !== undefined ? { envelope: note.envelope } : {}),
        ...(note.gainDb !== undefined ? { gainDb: note.gainDb } : {}),
      };
      collectLayer(noteLayer, offsetSec + note.time, out, rng);
    }
    return;
  }
  const buf = renderLeaf(layer, rng);
  if (offsetSec === 0) { out.push(buf); return; }
  const offSamples = Math.round(offsetSec * SAMPLE_RATE);
  const shifted = new Float32Array(offSamples + buf.length);
  shifted.set(buf, offSamples);
  out.push(shifted);
}

function renderLeaf(layer: OscLayer | NoiseLayer, rng: () => number): Float32Array {
  let buf: Float32Array;
  if (layer.kind === 'osc') {
    buf = osc(layer.wave, layer.freqStart, layer.freqEnd ?? layer.freqStart, layer.duration);
  } else {
    buf = noise(layer.duration, layer.color, rng);
    if (layer.lowpassHz !== undefined) lowpass(buf, layer.lowpassHz);
  }
  if (layer.envelope) applyAdsr(buf, layer.envelope);
  if (layer.gainDb !== undefined) gain(buf, layer.gainDb);
  return buf;
}

export const SOUND_SPECS: Readonly<Record<SfxKey, SoundSpec>> = {
  // Bullet Turret: classic dry pop — short noise burst with a square thump.
  'tower-fire-bullet-turret': {
    totalSec: 0.10,
    layers: [
      { kind: 'noise', color: 'white', duration: 0.04, lowpassHz: 4500,
        envelope: { attack: 0.001, decay: 0.015, sustain: 0, release: 0.025 } },
      { kind: 'osc', wave: 'square', freqStart: 240, freqEnd: 130, duration: 0.06,
        envelope: { attack: 0.001, decay: 0.020, sustain: 0, release: 0.030 }, gainDb: -6 },
    ],
  },
  // Machine Gun: rapid clicky pop — short noise tick, very small body.
  'tower-fire-machine-gun': {
    totalSec: 0.06,
    layers: [
      { kind: 'noise', color: 'white', duration: 0.025, lowpassHz: 5000,
        envelope: { attack: 0.001, decay: 0.010, sustain: 0, release: 0.015 } },
      { kind: 'osc', wave: 'square', freqStart: 320, freqEnd: 200, duration: 0.04,
        envelope: { attack: 0.001, decay: 0.012, sustain: 0, release: 0.020 }, gainDb: -10 },
    ],
  },
  'tower-fire-firewall': {
    totalSec: 0.10,
    layers: [
      { kind: 'noise', color: 'white', duration: 0.06, lowpassHz: 2000,
        envelope: { attack: 0.002, decay: 0.030, sustain: 0, release: 0.030 } },
      { kind: 'osc', wave: 'sine', freqStart: 120, freqEnd: 80, duration: 0.06,
        envelope: { attack: 0.002, decay: 0.030, sustain: 0, release: 0.030 }, gainDb: -3 },
    ],
  },
  'tower-fire-logic-bomb': {
    totalSec: 0.18,
    layers: [
      { kind: 'osc', wave: 'square', freqStart: 200, freqEnd: 60, duration: 0.15,
        envelope: { attack: 0.002, decay: 0.060, sustain: 0.2, release: 0.080 }, gainDb: -6 },
      { kind: 'noise', color: 'white', duration: 0.04, lowpassHz: 1500,
        envelope: { attack: 0.001, decay: 0.020, sustain: 0, release: 0.020 } },
    ],
  },
  'tower-fire-ice-lance': {
    totalSec: 0.14,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 300, freqEnd: 1400, duration: 0.10,
        envelope: { attack: 0.001, decay: 0.040, sustain: 0.3, release: 0.060 } },
      { kind: 'noise', color: 'white', duration: 0.06, lowpassHz: 4000,
        envelope: { attack: 0.001, decay: 0.030, sustain: 0, release: 0.030 }, gainDb: -10 },
    ],
  },
  // Sniper: a sharp crack with a low-end thump. Short noise burst rides on top
  // of a short downward sine to give the body of a heavy round being fired.
  'tower-fire-sniper': {
    totalSec: 0.22,
    layers: [
      { kind: 'noise', color: 'white', duration: 0.05, lowpassHz: 6000,
        envelope: { attack: 0.001, decay: 0.020, sustain: 0, release: 0.030 }, gainDb: -2 },
      { kind: 'osc', wave: 'sine', freqStart: 90, freqEnd: 45, duration: 0.18,
        envelope: { attack: 0.002, decay: 0.060, sustain: 0.2, release: 0.110 }, gainDb: -4 },
      { kind: 'osc', wave: 'square', freqStart: 180, freqEnd: 60, duration: 0.05,
        envelope: { attack: 0.001, decay: 0.020, sustain: 0, release: 0.030 }, gainDb: -10 },
    ],
  },
  // Tesla coil: fast electric zap. Brief noise pop layered with a rising,
  // buzzy square sweep to evoke a high-voltage arc.
  'tower-fire-tesla-coil': {
    totalSec: 0.18,
    layers: [
      { kind: 'noise', color: 'white', duration: 0.03, lowpassHz: 8000,
        envelope: { attack: 0.001, decay: 0.010, sustain: 0, release: 0.020 }, gainDb: -6 },
      { kind: 'osc', wave: 'square', freqStart: 600, freqEnd: 1800, duration: 0.10,
        envelope: { attack: 0.001, decay: 0.030, sustain: 0.4, release: 0.060 }, gainDb: -10 },
      { kind: 'osc', wave: 'saw', freqStart: 1200, freqEnd: 400, duration: 0.12,
        envelope: { attack: 0.001, decay: 0.040, sustain: 0.2, release: 0.080 }, gainDb: -14 },
    ],
  },
  // Venom spire: pressurized hiss with a slight downward pitch. Pink noise gives
  // the splatter, the muted sine adds a wet thump for the dart impacting air.
  'tower-fire-venom-spire': {
    totalSec: 0.16,
    layers: [
      { kind: 'noise', color: 'pink', duration: 0.12, lowpassHz: 2200,
        envelope: { attack: 0.005, decay: 0.040, sustain: 0.3, release: 0.080 }, gainDb: -4 },
      { kind: 'osc', wave: 'sine', freqStart: 440, freqEnd: 220, duration: 0.10,
        envelope: { attack: 0.003, decay: 0.040, sustain: 0.2, release: 0.060 }, gainDb: -12 },
    ],
  },
  // EMP: capacitor discharge — quick rising whine + low boom.
  'tower-fire-emp': {
    totalSec: 0.22,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 220, freqEnd: 880, duration: 0.06,
        envelope: { attack: 0.001, decay: 0.020, sustain: 0.4, release: 0.040 }, gainDb: -4 },
      { kind: 'osc', wave: 'sine', freqStart: 60, freqEnd: 30, duration: 0.20,
        envelope: { attack: 0.005, decay: 0.080, sustain: 0.3, release: 0.110 }, gainDb: -2 },
      { kind: 'noise', color: 'white', duration: 0.10, lowpassHz: 4000,
        envelope: { attack: 0.001, decay: 0.030, sustain: 0.2, release: 0.060 }, gainDb: -8 },
    ],
  },
  // Plasma cannon: heavy whoomp — square sweep + thumping low end.
  'tower-fire-plasma-cannon': {
    totalSec: 0.28,
    layers: [
      { kind: 'osc', wave: 'square', freqStart: 380, freqEnd: 80, duration: 0.18,
        envelope: { attack: 0.003, decay: 0.060, sustain: 0.3, release: 0.100 }, gainDb: -4 },
      { kind: 'osc', wave: 'sine', freqStart: 70, freqEnd: 35, duration: 0.24,
        envelope: { attack: 0.005, decay: 0.080, sustain: 0.4, release: 0.140 }, gainDb: -2 },
      { kind: 'noise', color: 'white', duration: 0.06, lowpassHz: 3000,
        envelope: { attack: 0.001, decay: 0.020, sustain: 0, release: 0.040 }, gainDb: -8 },
    ],
  },
  // Mortar: deep thump + airborne whoosh.
  'tower-fire-mortar': {
    totalSec: 0.32,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 90, freqEnd: 40, duration: 0.28,
        envelope: { attack: 0.005, decay: 0.080, sustain: 0.4, release: 0.180 }, gainDb: -2 },
      { kind: 'noise', color: 'pink', duration: 0.16, lowpassHz: 1800,
        envelope: { attack: 0.005, decay: 0.060, sustain: 0.3, release: 0.100 }, gainDb: -8 },
      { kind: 'osc', wave: 'square', freqStart: 200, freqEnd: 60, duration: 0.06,
        envelope: { attack: 0.001, decay: 0.020, sustain: 0, release: 0.030 }, gainDb: -10 },
    ],
  },
  // Marker: short blip — tracker lock.
  'tower-fire-marker': {
    totalSec: 0.10,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 1200, freqEnd: 1600, duration: 0.05,
        envelope: { attack: 0.001, decay: 0.015, sustain: 0.4, release: 0.030 } },
      { kind: 'osc', wave: 'sine', freqStart: 600, duration: 0.04,
        envelope: { attack: 0.001, decay: 0.010, sustain: 0.2, release: 0.020 }, gainDb: -8 },
    ],
  },
  // Beam cannon: sustained sizzle that ramps; short tick per pulse.
  'tower-fire-beam-cannon': {
    totalSec: 0.12,
    layers: [
      { kind: 'osc', wave: 'saw', freqStart: 800, freqEnd: 1100, duration: 0.10,
        envelope: { attack: 0.001, decay: 0.020, sustain: 0.5, release: 0.040 }, gainDb: -8 },
      { kind: 'noise', color: 'white', duration: 0.08, lowpassHz: 6000,
        envelope: { attack: 0.001, decay: 0.020, sustain: 0.3, release: 0.040 }, gainDb: -10 },
    ],
  },
  // Flamer: pressurized whoosh with fluttering low rumble.
  'tower-fire-flamer': {
    totalSec: 0.18,
    layers: [
      { kind: 'noise', color: 'pink', duration: 0.16, lowpassHz: 1500,
        envelope: { attack: 0.005, decay: 0.040, sustain: 0.4, release: 0.080 }, gainDb: -2 },
      { kind: 'osc', wave: 'sine', freqStart: 140, freqEnd: 90, duration: 0.14,
        envelope: { attack: 0.005, decay: 0.040, sustain: 0.3, release: 0.080 }, gainDb: -10 },
    ],
  },
  'enemy-hit': {
    totalSec: 0.07,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 800, duration: 0.05,
        envelope: { attack: 0.001, decay: 0.020, sustain: 0, release: 0.030 } },
      { kind: 'noise', color: 'white', duration: 0.02, lowpassHz: 3000,
        envelope: { attack: 0.001, decay: 0.010, sustain: 0, release: 0.010 }, gainDb: -6 },
    ],
  },
  'enemy-death': {
    totalSec: 0.30,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 400, freqEnd: 100, duration: 0.25,
        envelope: { attack: 0.005, decay: 0.080, sustain: 0.3, release: 0.150 } },
      { kind: 'noise', color: 'pink', duration: 0.20, lowpassHz: 1200,
        envelope: { attack: 0.005, decay: 0.080, sustain: 0.1, release: 0.120 }, gainDb: -10 },
    ],
  },
  'wave-start': {
    totalSec: 0.35,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 440, duration: 0.12,
        envelope: { attack: 0.005, decay: 0.040, sustain: 0.3, release: 0.060 } },
      { kind: 'sequence', offsets: [0.15], layer: {
        kind: 'osc', wave: 'sine', freqStart: 660, duration: 0.18,
        envelope: { attack: 0.005, decay: 0.060, sustain: 0.3, release: 0.100 },
      }},
    ],
  },
  'life-lost': {
    totalSec: 0.25,
    layers: [
      { kind: 'osc', wave: 'square', freqStart: 600, freqEnd: 200, duration: 0.20,
        envelope: { attack: 0.002, decay: 0.040, sustain: 0.4, release: 0.150 }, gainDb: -6 },
    ],
  },
  'win': {
    totalSec: 0.55,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 523, duration: 0.15,
        envelope: { attack: 0.005, decay: 0.040, sustain: 0.5, release: 0.090 } },
      { kind: 'sequence', offsets: [0.15], layer: {
        kind: 'osc', wave: 'sine', freqStart: 659, duration: 0.15,
        envelope: { attack: 0.005, decay: 0.040, sustain: 0.5, release: 0.090 },
      }},
      { kind: 'sequence', offsets: [0.30], layer: {
        kind: 'osc', wave: 'sine', freqStart: 784, duration: 0.20,
        envelope: { attack: 0.005, decay: 0.040, sustain: 0.5, release: 0.150 },
      }},
    ],
  },
  'lose': {
    totalSec: 0.85,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 440, duration: 0.25,
        envelope: { attack: 0.010, decay: 0.060, sustain: 0.5, release: 0.150 } },
      { kind: 'sequence', offsets: [0.25], layer: {
        kind: 'osc', wave: 'sine', freqStart: 349, duration: 0.25,
        envelope: { attack: 0.010, decay: 0.060, sustain: 0.5, release: 0.150 },
      }},
      { kind: 'sequence', offsets: [0.50], layer: {
        kind: 'osc', wave: 'sine', freqStart: 261, duration: 0.30,
        envelope: { attack: 0.010, decay: 0.060, sustain: 0.5, release: 0.220 },
      }},
    ],
  },
  'ui-click': {
    totalSec: 0.025,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 1000, duration: 0.012,
        envelope: { attack: 0.001, decay: 0.005, sustain: 0, release: 0.005 } },
    ],
  },
  'tower-placed': {
    totalSec: 0.10,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 300, freqEnd: 500, duration: 0.08,
        envelope: { attack: 0.005, decay: 0.020, sustain: 0.4, release: 0.040 } },
    ],
  },
};

// --- Music ---------------------------------------------------------------
// Loops bake to disk like SFX. For seamless joins, sustained osc layers use
// frequencies whose period divides the loop length (integer cycles per loop);
// pattern layers ensure the last note's envelope completes before the loop
// boundary so there's no audible click on repeat.

// --- Menu theme — "haven" -----------------------------------------------
// Port of the gemax HUB_T1 soundtrack. 64 BPM, four-chord progression
// C–Am–F–G, sparse offbeat arp (ARP_CALM), retriggered triangle bass,
// sustained sine pad with a slow swell. 30s loop, click-free.
const MENU_BPM = 64;
const MENU_BEAT_SEC = 60 / MENU_BPM;            // 0.9375s
const MENU_SIXTEENTH = MENU_BEAT_SEC / 4;       // 0.234375s
const MENU_CHORD_DUR = 32 * MENU_SIXTEENTH;     // 7.5s — 2 bars per chord
const MENU_LOOP_SEC = 4 * MENU_CHORD_DUR;       // 30s

type HavenChord = {
  bass: number;
  pad: readonly [number, number, number];
  arp: readonly [number, number, number, number];
};
const HAVEN_PROGRESSION: readonly HavenChord[] = [
  { bass: 65.41, pad: [261.63, 329.63, 392.00], arp: [196.00, 261.63, 329.63, 392.00] }, // C
  { bass: 55.00, pad: [220.00, 261.63, 329.63], arp: [220.00, 261.63, 329.63, 440.00] }, // Am
  { bass: 43.65, pad: [174.61, 220.00, 261.63], arp: [174.61, 220.00, 261.63, 349.23] }, // F
  { bass: 49.00, pad: [196.00, 246.94, 293.66], arp: [196.00, 246.94, 293.66, 392.00] }, // G
];

// ARP_CALM expanded: sixteenth step within chord → arp index. Pattern is
// 16 steps (sparse offbeat) cycled twice per chord.
const HAVEN_ARP_STEPS: readonly { step: number; arpIdx: number }[] = [
  { step: 0,  arpIdx: 0 }, { step: 4,  arpIdx: 2 }, { step: 7,  arpIdx: 1 },
  { step: 10, arpIdx: 0 }, { step: 14, arpIdx: 2 },
  { step: 16, arpIdx: 0 }, { step: 20, arpIdx: 2 }, { step: 23, arpIdx: 1 },
  { step: 26, arpIdx: 0 }, { step: 30, arpIdx: 2 },
];

// Bass retriggers every half-bar (8 sixteenths).
const HAVEN_BASS_STEPS: readonly number[] = [0, 8, 16, 24];

const menuPad: PatternNote[] = [];
const menuBass: PatternNote[] = [];
const menuArp: PatternNote[] = [];

for (let ci = 0; ci < HAVEN_PROGRESSION.length; ci++) {
  const chord = HAVEN_PROGRESSION[ci]!;
  const chordStart = ci * MENU_CHORD_DUR;

  for (const freq of chord.pad) {
    menuPad.push({
      time: chordStart,
      freq,
      duration: MENU_CHORD_DUR - 0.5,
      wave: 'sine',
      envelope: { attack: 0.9, decay: 0.6, sustain: 0.7, release: 0.5 },
      gainDb: -22,
    });
  }

  for (const step of HAVEN_BASS_STEPS) {
    menuBass.push({
      time: chordStart + step * MENU_SIXTEENTH,
      freq: chord.bass,
      duration: 6 * MENU_SIXTEENTH,
      wave: 'tri',
      envelope: { attack: 0.012, decay: 0.18, sustain: 0.4, release: 0.40 },
      gainDb: -16,
    });
  }

  for (const { step, arpIdx } of HAVEN_ARP_STEPS) {
    menuArp.push({
      time: chordStart + step * MENU_SIXTEENTH,
      freq: chord.arp[arpIdx]!,
      duration: 1.3 * MENU_SIXTEENTH,
      wave: 'sine',
      envelope: { attack: 0.005, decay: 0.10, sustain: 0.2, release: 0.05 },
      gainDb: -18,
    });
  }
}

const GAME_BEATS = 32;
const GAME_BPM = 100;
const GAME_BEAT_SEC = 60 / GAME_BPM;          // 0.6
const GAME_LOOP_SEC = GAME_BEATS * GAME_BEAT_SEC; // 19.2
// A minor pad freqs tuned for integer cycles in 19.2s (≤ 5 cents off equal-temperament).
const GAME_PAD_A = 220;                       // 4224 cycles
const GAME_PAD_C = 5023 / GAME_LOOP_SEC;      // ≈ 261.61
const GAME_PAD_E = 6329 / GAME_LOOP_SEC;      // ≈ 329.64

const gameBass: PatternNote[] = [];
for (let i = 0; i < GAME_BEATS; i++) {
  gameBass.push({
    time: i * GAME_BEAT_SEC,
    freq: 110, // A2
    duration: 0.4,
    wave: 'square',
    envelope: { attack: 0.005, decay: 0.10, sustain: 0, release: 0.05 },
    gainDb: -8,
  });
}

// Sparse melody — A minor pentatonic, beats 0/8/16/24 with note shape.
const PENT = [440, 523.25, 587.33, 659.25, 783.99]; // A4 C5 D5 E5 G5
const gameMelody: PatternNote[] = [
  { time: 0  * GAME_BEAT_SEC, freq: PENT[0]!, duration: 0.4, wave: 'sine',
    envelope: { attack: 0.02, decay: 0.10, sustain: 0.4, release: 0.20 }, gainDb: -10 },
  { time: 8  * GAME_BEAT_SEC, freq: PENT[2]!, duration: 0.4, wave: 'sine',
    envelope: { attack: 0.02, decay: 0.10, sustain: 0.4, release: 0.20 }, gainDb: -10 },
  { time: 16 * GAME_BEAT_SEC, freq: PENT[4]!, duration: 0.4, wave: 'sine',
    envelope: { attack: 0.02, decay: 0.10, sustain: 0.4, release: 0.20 }, gainDb: -10 },
  { time: 24 * GAME_BEAT_SEC, freq: PENT[3]!, duration: 0.4, wave: 'sine',
    envelope: { attack: 0.02, decay: 0.10, sustain: 0.4, release: 0.20 }, gainDb: -10 },
];

export const MUSIC_SPECS: Readonly<Record<MusicKey, SoundSpec>> = {
  'main-menu': {
    totalSec: MENU_LOOP_SEC,
    layers: [
      { kind: 'pattern', notes: menuPad },
      { kind: 'pattern', notes: menuBass },
      { kind: 'pattern', notes: menuArp },
    ],
  },
  'in-game': {
    totalSec: GAME_LOOP_SEC,
    layers: [
      // Held A minor chord pad
      { kind: 'osc', wave: 'sine', freqStart: GAME_PAD_A, duration: GAME_LOOP_SEC, gainDb: -14 },
      { kind: 'osc', wave: 'sine', freqStart: GAME_PAD_C, duration: GAME_LOOP_SEC, gainDb: -16 },
      { kind: 'osc', wave: 'sine', freqStart: GAME_PAD_E, duration: GAME_LOOP_SEC, gainDb: -16 },
      // Bass arpeggio
      { kind: 'pattern', notes: gameBass },
      // Sparse melody
      { kind: 'pattern', notes: gameMelody },
    ],
  },
};
