export const SAMPLE_RATE = 44100;
export type Wave = 'sine' | 'square' | 'tri' | 'saw';
export type Rng = () => number;

/** mulberry32 — same family as engine/rng.ts but a fresh, audio-local instance. */
export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate `durationSec` of `wave` with frequency sweeping linearly from
 * `freqStart` to `freqEnd`. Phase is integrated sample-by-sample so sweeps
 * have no discontinuities at sample boundaries.
 */
export function osc(wave: Wave, freqStart: number, freqEnd: number, durationSec: number): Float32Array {
  const n = Math.max(0, Math.round(durationSec * SAMPLE_RATE));
  const out = new Float32Array(n);
  if (n === 0) return out;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const freq = freqStart + (freqEnd - freqStart) * t;
    out[i] = sample(wave, phase);
    phase += freq / SAMPLE_RATE;
    if (phase >= 1) phase -= Math.floor(phase);
  }
  return out;
}

function sample(wave: Wave, phase: number): number {
  switch (wave) {
    case 'sine':   return Math.sin(2 * Math.PI * phase);
    case 'square': return phase < 0.5 ? 1 : -1;
    case 'tri':    return 4 * Math.abs(phase - 0.5) - 1;
    case 'saw':    return 2 * phase - 1;
  }
}
