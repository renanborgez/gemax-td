import { describe, it, expect } from 'vitest';
import { invariant } from '@/lib/assert';

describe('invariant', () => {
  it('throws on falsy', () => {
    expect(() => invariant(false, 'oops')).toThrowError('oops');
  });
  it('does not throw on truthy', () => {
    expect(() => invariant(true, 'ok')).not.toThrow();
  });
  it('narrows the type after the call', () => {
    const x: number | null = 1 as number | null;
    invariant(x !== null, 'x must be set');
    // @ts-expect-error if narrowing fails to remove null
    const y: number = x;
    expect(y).toBe(1);
  });
});
