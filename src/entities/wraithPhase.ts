/**
 * Wraith phase cycle — boss special for chapter 1.
 *
 *   ┌─ phase out (untargetable) ─┐
 *   │      PHASE_DURATION       │
 *   ├────────────────────────────┴──────────────── targetable ─────────┤
 *   0 ─────────────────────── PHASE_PERIOD ────────────────────────────┘
 *
 * Each wraith offsets its cycle by a stable hash of its entity id, so a wave
 * of wraiths doesn't phase in lockstep. Pure time-based: no per-enemy state
 * needs to persist across frames — determinism falls out of the id hash and
 * the engine's deterministic sim time.
 */

export const WRAITH_PHASE_PERIOD = 4.0;     // seconds per cycle
export const WRAITH_PHASE_DURATION = 1.0;   // seconds untargetable per cycle

/** djb2-derived stable hash of an entity id, normalized to [0, PHASE_PERIOD). */
export function wraithPhaseOffset(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  }
  // h is a signed 32-bit int; map to positive then take fractional period.
  const positive = h >>> 0;
  return (positive / 0xffffffff) * WRAITH_PHASE_PERIOD;
}

export function isWraithPhasing(id: string, simTime: number): boolean {
  const offset = wraithPhaseOffset(id);
  // floored modulo so negative simTime (shouldn't happen, but safe) wraps.
  const t = ((simTime + offset) % WRAITH_PHASE_PERIOD + WRAITH_PHASE_PERIOD) % WRAITH_PHASE_PERIOD;
  return t < WRAITH_PHASE_DURATION;
}
