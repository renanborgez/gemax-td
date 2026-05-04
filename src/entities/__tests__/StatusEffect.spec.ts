import { describe, it, expect } from 'vitest';
import {
  type StatusEffect, freshStatus, tickStatuses, slowMultiplier, isFrozenOrStunned,
} from '@/entities/StatusEffect';

describe('StatusEffect helpers', () => {
  it('tickStatuses decrements remaining and removes expired', () => {
    const list: StatusEffect[] = [
      freshStatus({ kind: 'slow', magnitude: 0.5, duration: 1.0, appliedByTowerId: 't:1' }),
      freshStatus({ kind: 'freeze', magnitude: 1.0, duration: 0.5, appliedByTowerId: 't:2' }),
    ];
    tickStatuses(list, 0.6);
    expect(list).toHaveLength(1);     // freeze expired
    expect(list[0]!.kind).toBe('slow');
    expect(list[0]!.remaining).toBeCloseTo(0.4);
  });

  it('slowMultiplier returns the strongest slow', () => {
    const list: StatusEffect[] = [
      freshStatus({ kind: 'slow', magnitude: 0.3, duration: 1, appliedByTowerId: 't:1' }),
      freshStatus({ kind: 'slow', magnitude: 0.6, duration: 1, appliedByTowerId: 't:2' }),
    ];
    expect(slowMultiplier(list)).toBeCloseTo(0.4); // 1 - 0.6
  });

  it('isFrozenOrStunned is true if any freeze/stun present', () => {
    const list: StatusEffect[] = [
      freshStatus({ kind: 'slow', magnitude: 0.3, duration: 1, appliedByTowerId: 't:1' }),
    ];
    expect(isFrozenOrStunned(list)).toBe(false);
    list.push(freshStatus({ kind: 'freeze', magnitude: 1, duration: 1, appliedByTowerId: 't:2' }));
    expect(isFrozenOrStunned(list)).toBe(true);
  });
});
