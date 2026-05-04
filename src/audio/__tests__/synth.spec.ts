import { describe, expect, it } from 'vitest';
import { osc, makeRng, SAMPLE_RATE } from '@/audio/synth';

describe('SAMPLE_RATE', () => {
  it('is 44100', () => {
    expect(SAMPLE_RATE).toBe(44100);
  });
});

describe('osc', () => {
  it('returns the right sample count for a fixed-frequency tone', () => {
    const buf = osc('sine', 1000, 1000, 0.01);
    expect(buf).toBeInstanceOf(Float32Array);
    expect(buf.length).toBe(441);
  });

  it('starts a sine at zero with peak near 1.0', () => {
    const buf = osc('sine', 1000, 1000, 0.01);
    expect(buf[0]).toBeCloseTo(0, 4);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]!));
    expect(peak).toBeGreaterThan(0.99);
    expect(peak).toBeLessThanOrEqual(1.0001);
  });

  it('produces square waves bounded to ±1', () => {
    const buf = osc('square', 500, 500, 0.01);
    for (let i = 0; i < buf.length; i++) expect(Math.abs(buf[i]!)).toBeCloseTo(1, 6);
  });

  it('sweeps frequency linearly without phase discontinuities', () => {
    const buf = osc('sine', 100, 200, 0.05);
    // No sample-to-sample jump should exceed roughly 2π·fmax/sr in amplitude (~0.03)
    let maxJump = 0;
    for (let i = 1; i < buf.length; i++) maxJump = Math.max(maxJump, Math.abs(buf[i]! - buf[i - 1]!));
    expect(maxJump).toBeLessThan(0.05);
  });
});

describe('makeRng', () => {
  it('is deterministic for the same seed', () => {
    const a = makeRng(0xdeadbeef);
    const b = makeRng(0xdeadbeef);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it('produces values in [0, 1)', () => {
    const r = makeRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

import { noise, applyAdsr } from '@/audio/synth';

describe('noise', () => {
  it('returns the right length for the requested duration', () => {
    const buf = noise(0.01, 'white', makeRng(1));
    expect(buf.length).toBe(441);
  });

  it('keeps white-noise samples bounded in [-1, 1]', () => {
    const buf = noise(0.05, 'white', makeRng(7));
    for (let i = 0; i < buf.length; i++) {
      expect(buf[i]!).toBeGreaterThanOrEqual(-1);
      expect(buf[i]!).toBeLessThanOrEqual(1);
    }
  });

  it('keeps pink-noise samples bounded in [-1, 1]', () => {
    const buf = noise(0.05, 'pink', makeRng(7));
    for (let i = 0; i < buf.length; i++) {
      expect(buf[i]!).toBeGreaterThanOrEqual(-1);
      expect(buf[i]!).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic given the same RNG seed', () => {
    const a = noise(0.01, 'white', makeRng(42));
    const b = noise(0.01, 'white', makeRng(42));
    for (let i = 0; i < a.length; i++) expect(a[i]).toBe(b[i]);
  });
});

describe('applyAdsr', () => {
  it('shapes the envelope at boundary samples', () => {
    const buf = new Float32Array(SAMPLE_RATE).fill(1); // 1 second of DC
    applyAdsr(buf, { attack: 0.1, decay: 0.1, sustain: 0.5, release: 0.1 });
    // start: 0
    expect(buf[0]!).toBeCloseTo(0, 4);
    // end of attack (~0.1s): peak ≈ 1
    expect(buf[Math.round(SAMPLE_RATE * 0.1) - 1]!).toBeCloseTo(1, 2);
    // end of decay (~0.2s): sustain level ≈ 0.5
    expect(buf[Math.round(SAMPLE_RATE * 0.2)]!).toBeCloseTo(0.5, 2);
    // mid-sustain (~0.5s): still ≈ 0.5
    expect(buf[Math.round(SAMPLE_RATE * 0.5)]!).toBeCloseTo(0.5, 2);
    // end of release (~1.0s, last sample): ≈ 0
    expect(buf[buf.length - 1]!).toBeCloseTo(0, 2);
  });

  it('returns the same buffer (mutates in place)', () => {
    const buf = new Float32Array(100).fill(1);
    const ret = applyAdsr(buf, { attack: 0.001, decay: 0.001, sustain: 0.5, release: 0.001 });
    expect(ret).toBe(buf);
  });
});

import { lowpass, mix, pad, gain } from '@/audio/synth';

describe('lowpass', () => {
  it('returns the same buffer (mutates in place)', () => {
    const buf = new Float32Array(100).fill(1);
    const ret = lowpass(buf, 1000);
    expect(ret).toBe(buf);
  });

  it('attenuates a high-frequency tone more than a low-frequency tone', () => {
    const high = osc('sine', 8000, 8000, 0.05);
    const low = osc('sine', 200, 200, 0.05);
    lowpass(high, 1000);
    lowpass(low, 1000);
    const peak = (b: Float32Array) => {
      let m = 0;
      for (let i = 0; i < b.length; i++) m = Math.max(m, Math.abs(b[i]!));
      return m;
    };
    expect(peak(high)).toBeLessThan(peak(low));
  });
});

describe('mix', () => {
  it('sums shorter buffers into a longer output without attenuating in-range values', () => {
    const a = new Float32Array([0.5, 0.5, 0.5, 0.5]);
    const b = new Float32Array([0.5, 0.5]);
    const out = mix([a, b]);
    expect(out.length).toBe(4);
    // First two samples sum to 1.0 — within range, passed through unchanged.
    expect(out[0]!).toBeCloseTo(1, 6);
    expect(out[1]!).toBeCloseTo(1, 6);
    // Third sample is the tail of `a` only — unchanged.
    expect(out[2]!).toBeCloseTo(0.5, 6);
  });

  it('soft-clips only when the summed value exceeds ±1', () => {
    const a = new Float32Array([2, -2]);
    const out = mix([a]);
    // Out-of-range: clipped via tanh.
    expect(out[0]!).toBeCloseTo(Math.tanh(2), 4);
    expect(out[1]!).toBeCloseTo(-Math.tanh(2), 4);
    expect(Math.abs(out[0]!)).toBeLessThan(1);
  });

  it('applies per-buffer gainsDb (in-range stays linear)', () => {
    const a = new Float32Array([1]);
    const out = mix([a], [-6]); // -6 dB ≈ 0.501
    expect(out[0]!).toBeCloseTo(0.501, 3);
  });
});

describe('pad', () => {
  it('zero-pads the tail to reach totalSec', () => {
    const a = new Float32Array([1, 1]);
    const out = pad(a, 0.001); // 44 samples at 44.1 kHz
    expect(out.length).toBe(44);
    expect(out[0]).toBe(1);
    expect(out[1]).toBe(1);
    expect(out[2]).toBe(0);
    expect(out[43]).toBe(0);
  });

  it('does not truncate when input is already longer', () => {
    const a = new Float32Array(1000).fill(1);
    const out = pad(a, 0.001);
    expect(out.length).toBe(1000);
  });
});

describe('gain', () => {
  it('scales by dB in place', () => {
    const buf = new Float32Array([1]);
    gain(buf, -6);
    expect(buf[0]!).toBeCloseTo(0.501, 3);
  });
});
