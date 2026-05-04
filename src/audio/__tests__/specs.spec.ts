import { describe, expect, it } from 'vitest';
import type { SoundSpec } from '@/audio/specs';
import { renderSpec, specHash, SOUND_SPECS } from '@/audio/specs';
import { SAMPLE_RATE } from '@/audio/synth';

describe('renderSpec', () => {
  it('renders a single-osc spec to the right length', () => {
    const spec: SoundSpec = {
      totalSec: 0.05,
      layers: [{ kind: 'osc', wave: 'sine', freqStart: 1000, duration: 0.05 }],
    };
    const out = renderSpec(spec);
    expect(out.length).toBe(Math.round(0.05 * SAMPLE_RATE));
  });

  it('is deterministic for the same spec', () => {
    const spec: SoundSpec = {
      totalSec: 0.05,
      layers: [
        { kind: 'osc', wave: 'sine', freqStart: 500, duration: 0.05 },
        { kind: 'noise', color: 'white', duration: 0.05 },
      ],
    };
    const a = renderSpec(spec);
    const b = renderSpec(spec);
    for (let i = 0; i < a.length; i++) expect(a[i]).toBe(b[i]);
  });

  it('time-shifts sequence offsets', () => {
    const spec: SoundSpec = {
      totalSec: 0.1,
      layers: [{
        kind: 'sequence',
        offsets: [0, 0.05],
        layer: { kind: 'osc', wave: 'sine', freqStart: 1000, duration: 0.005 },
      }],
    };
    const out = renderSpec(spec);
    // First pip energy is in the first ~220 samples; second pip starts at sample ~2205.
    const energy = (start: number, end: number) => {
      let e = 0;
      for (let i = start; i < end; i++) e += out[i]! * out[i]!;
      return e;
    };
    const firstWindow = energy(0, 220);
    const gapWindow = energy(500, 2000);
    const secondWindow = energy(2205, 2425);
    expect(firstWindow).toBeGreaterThan(gapWindow);
    expect(secondWindow).toBeGreaterThan(gapWindow);
  });
});

describe('specHash', () => {
  it('is stable across calls', () => {
    const s = SOUND_SPECS['ui-click'];
    expect(specHash(s)).toBe(specHash(s));
  });

  it('differs when any field changes', () => {
    const a: SoundSpec = { totalSec: 0.01, layers: [{ kind: 'osc', wave: 'sine', freqStart: 1000, duration: 0.01 }] };
    const b: SoundSpec = { totalSec: 0.01, layers: [{ kind: 'osc', wave: 'sine', freqStart: 1001, duration: 0.01 }] };
    expect(specHash(a)).not.toBe(specHash(b));
  });

  it('produces an 8-character lowercase hex string', () => {
    const h = specHash(SOUND_SPECS['ui-click']);
    expect(h).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('SOUND_SPECS', () => {
  it('covers all 11 SFX keys', () => {
    const expected = [
      'tower-fire-firewall', 'tower-fire-logic-bomb', 'tower-fire-ice-lance',
      'enemy-hit', 'enemy-death', 'wave-start', 'life-lost', 'win', 'lose',
      'ui-click', 'tower-placed',
    ] as const;
    for (const k of expected) expect(SOUND_SPECS[k]).toBeDefined();
    expect(Object.keys(SOUND_SPECS).sort()).toEqual([...expected].sort());
  });
});
