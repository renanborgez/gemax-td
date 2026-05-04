import { describe, it, expect } from 'vitest';
import { ObjectPool } from '@/engine/pool/ObjectPool';

type Boxed = { value: number; alive: boolean };

describe('ObjectPool', () => {
  it('pre-allocates instances and reuses them', () => {
    let constructed = 0;
    const pool = new ObjectPool<Boxed>({
      create: () => { constructed++; return { value: 0, alive: false }; },
      reset: (b) => { b.value = 0; b.alive = false; },
      initialSize: 4,
    });
    expect(constructed).toBe(4);

    const a = pool.acquire(); a.value = 1; a.alive = true;
    const b = pool.acquire(); b.value = 2; b.alive = true;
    pool.release(a);
    const c = pool.acquire();
    expect(c).toBe(a);                // reused
    expect(c.value).toBe(0);          // reset was called
    expect(constructed).toBe(4);
  });

  it('grows when capacity is exceeded', () => {
    const pool = new ObjectPool<Boxed>({
      create: () => ({ value: 0, alive: false }),
      reset: (b) => { b.value = 0; b.alive = false; },
      initialSize: 1,
    });
    const a = pool.acquire();
    const b = pool.acquire();    // grow
    expect(a).not.toBe(b);
  });

  it('reports counts', () => {
    const pool = new ObjectPool<Boxed>({
      create: () => ({ value: 0, alive: false }),
      reset: (b) => { b.value = 0; },
      initialSize: 3,
    });
    expect(pool.freeCount).toBe(3);
    pool.acquire();
    expect(pool.freeCount).toBe(2);
    expect(pool.activeCount).toBe(1);
  });
});
