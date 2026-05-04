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
