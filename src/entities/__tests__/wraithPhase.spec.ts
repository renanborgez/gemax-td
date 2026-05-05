import { describe, it, expect } from 'vitest';
import {
  WRAITH_PHASE_PERIOD,
  WRAITH_PHASE_DURATION,
  wraithPhaseOffset,
  isWraithPhasing,
} from '@/entities/wraithPhase';

describe('wraithPhaseOffset', () => {
  it('is deterministic for the same id', () => {
    expect(wraithPhaseOffset('e-7')).toBe(wraithPhaseOffset('e-7'));
  });

  it('produces a value in [0, PHASE_PERIOD)', () => {
    for (const id of ['a', 'enemy-1', 'enemy-2', 'enemy-99', 'wraith-x']) {
      const o = wraithPhaseOffset(id);
      expect(o).toBeGreaterThanOrEqual(0);
      expect(o).toBeLessThan(WRAITH_PHASE_PERIOD);
    }
  });

  it('different ids produce different offsets (no global lockstep)', () => {
    const offsets = new Set(
      ['enemy-1', 'enemy-2', 'enemy-3', 'enemy-4', 'enemy-5'].map(wraithPhaseOffset),
    );
    expect(offsets.size).toBeGreaterThan(1);
  });
});

describe('isWraithPhasing', () => {
  it('uses an id-derived offset so the cycle is deterministic over sim time', () => {
    const id = 'enemy-1';
    const offset = wraithPhaseOffset(id);
    // Time = -offset puts the cycle exactly at t=0 in the phasing window.
    expect(isWraithPhasing(id, -offset + 0.01)).toBe(true);
    expect(isWraithPhasing(id, -offset + WRAITH_PHASE_DURATION + 0.01)).toBe(false);
  });

  it('phasing window length equals PHASE_DURATION', () => {
    const id = 'enemy-1';
    const offset = wraithPhaseOffset(id);
    let phasingTicks = 0;
    const samples = 1000;
    for (let i = 0; i < samples; i++) {
      const simTime = -offset + (i * WRAITH_PHASE_PERIOD) / samples;
      if (isWraithPhasing(id, simTime)) phasingTicks++;
    }
    const ratio = phasingTicks / samples;
    expect(ratio).toBeCloseTo(WRAITH_PHASE_DURATION / WRAITH_PHASE_PERIOD, 1);
  });

  it('repeats every PHASE_PERIOD', () => {
    const id = 'enemy-x';
    for (const t of [0, 1.5, 3.7, 12.1]) {
      expect(isWraithPhasing(id, t)).toBe(isWraithPhasing(id, t + WRAITH_PHASE_PERIOD));
      expect(isWraithPhasing(id, t)).toBe(isWraithPhasing(id, t + WRAITH_PHASE_PERIOD * 5));
    }
  });
});
