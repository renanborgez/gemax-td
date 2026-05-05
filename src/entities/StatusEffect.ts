export type StatusKind = 'slow' | 'stun' | 'dot' | 'freeze' | 'mark';

export type StatusEffect = {
  kind: StatusKind;
  magnitude: number;       // slow ratio, dot dps, etc.
  duration: number;        // seconds applied
  remaining: number;       // seconds left
  appliedByTowerId: string;
};

export function freshStatus(opts: {
  kind: StatusKind;
  magnitude: number;
  duration: number;
  appliedByTowerId: string;
}): StatusEffect {
  return { ...opts, remaining: opts.duration };
}

/** Mutate in place: decrement remaining, drop expired entries. */
export function tickStatuses(list: StatusEffect[], dt: number): void {
  let write = 0;
  for (let read = 0; read < list.length; read++) {
    const s = list[read]!;
    s.remaining -= dt;
    if (s.remaining > 0) {
      list[write++] = s;
    }
  }
  list.length = write;
}

/** Effective speed multiplier from slows. 1 = no slow, 0 = full stop. */
export function slowMultiplier(list: readonly StatusEffect[]): number {
  let strongest = 0;
  for (const s of list) {
    if (s.kind === 'slow' && s.magnitude > strongest) strongest = s.magnitude;
  }
  return 1 - strongest;
}

export function isFrozenOrStunned(list: readonly StatusEffect[]): boolean {
  for (const s of list) if (s.kind === 'freeze' || s.kind === 'stun') return true;
  return false;
}

/** Aggregate DoT damage per second across active dot statuses. */
export function totalDotDps(list: readonly StatusEffect[]): number {
  let total = 0;
  for (const s of list) if (s.kind === 'dot') total += s.magnitude;
  return total;
}

/** Multiplier applied to incoming damage when the enemy carries a `mark`
 *  status. Stacks multiplicatively across active marks (e.g. two markers
 *  active at once). 1.0 = no mark active. */
export function damageTakenMult(list: readonly StatusEffect[]): number {
  let mult = 1;
  for (const s of list) if (s.kind === 'mark') mult *= s.magnitude;
  return mult;
}
