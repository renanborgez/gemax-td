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

export type NoiseColor = 'white' | 'pink';

export function noise(durationSec: number, color: NoiseColor, rng: Rng): Float32Array {
  const n = Math.max(0, Math.round(durationSec * SAMPLE_RATE));
  const out = new Float32Array(n);
  if (color === 'white') {
    for (let i = 0; i < n; i++) out[i] = rng() * 2 - 1;
    return out;
  }
  // Voss-McCartney pink noise (8 octaves)
  const rows = new Float32Array(8);
  for (let i = 0; i < 8; i++) rows[i] = rng() * 2 - 1;
  let runningSum = rows.reduce((a, b) => a + b, 0);
  let counter = 0;
  for (let i = 0; i < n; i++) {
    counter = (counter + 1) | 0;
    let row = 0;
    while ((counter & (1 << row)) === 0 && row < 8) row++;
    if (row < 8) {
      const next = rng() * 2 - 1;
      runningSum += next - rows[row]!;
      rows[row] = next;
    }
    // Normalize: 8 sources sum into ±8 range; divide to keep ≤ 1.
    out[i] = runningSum / 8;
  }
  return out;
}

export type Adsr = { attack: number; decay: number; sustain: number; release: number };

/** Apply an ADSR amplitude envelope in place. Times in seconds; sustain is a 0..1 level. */
export function applyAdsr(buf: Float32Array, env: Adsr): Float32Array {
  const n = buf.length;
  if (n === 0) return buf;
  const a = Math.max(1, Math.round(env.attack * SAMPLE_RATE));
  const d = Math.max(1, Math.round(env.decay * SAMPLE_RATE));
  const r = Math.max(1, Math.round(env.release * SAMPLE_RATE));
  const sustainStart = Math.min(n, a + d);
  const releaseStart = Math.max(sustainStart, n - r);
  for (let i = 0; i < n; i++) {
    let g: number;
    if (i < a) {
      g = i / (a - 1 || 1);
    } else if (i < sustainStart) {
      const t = (i - a) / (d - 1 || 1);
      g = 1 - (1 - env.sustain) * t;
    } else if (i < releaseStart) {
      g = env.sustain;
    } else {
      const t = (i - releaseStart) / (n - releaseStart - 1 || 1);
      g = env.sustain * (1 - t);
    }
    buf[i] = buf[i]! * g;
  }
  return buf;
}

/** Single-pole IIR lowpass; mutates in place. */
export function lowpass(buf: Float32Array, cutoffHz: number): Float32Array {
  if (buf.length === 0) return buf;
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / SAMPLE_RATE;
  const alpha = dt / (rc + dt);
  let prev = buf[0]!;
  for (let i = 0; i < buf.length; i++) {
    prev = prev + alpha * (buf[i]! - prev);
    buf[i] = prev;
  }
  return buf;
}

/**
 * Sum buffers (zero-padded to max length). Pass-through when |sum| ≤ 1;
 * soft-clip via tanh only on samples that exceed the range. Single-layer
 * mixes therefore preserve full headroom.
 */
export function mix(buffers: Float32Array[], gainsDb?: number[]): Float32Array {
  let maxLen = 0;
  for (const b of buffers) maxLen = Math.max(maxLen, b.length);
  const out = new Float32Array(maxLen);
  for (let bi = 0; bi < buffers.length; bi++) {
    const buf = buffers[bi]!;
    const g = gainsDb && gainsDb[bi] !== undefined ? Math.pow(10, gainsDb[bi]! / 20) : 1;
    for (let i = 0; i < buf.length; i++) out[i] = out[i]! + buf[i]! * g;
  }
  for (let i = 0; i < out.length; i++) {
    const s = out[i]!;
    if (s > 1 || s < -1) out[i] = Math.tanh(s);
  }
  return out;
}

/** Right-pad a buffer with zeros so its length covers `totalSec`. */
export function pad(buf: Float32Array, totalSec: number): Float32Array {
  const target = Math.max(0, Math.round(totalSec * SAMPLE_RATE));
  if (buf.length >= target) return buf;
  const out = new Float32Array(target);
  out.set(buf, 0);
  return out;
}

/** Scale a buffer by `db` in place. */
export function gain(buf: Float32Array, db: number): Float32Array {
  const g = Math.pow(10, db / 20);
  for (let i = 0; i < buf.length; i++) buf[i] = buf[i]! * g;
  return buf;
}
