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
