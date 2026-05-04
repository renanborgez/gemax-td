import type { SfxKey } from '@/audio/catalog';
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

export type Layer = OscLayer | NoiseLayer | SequenceLayer;

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
