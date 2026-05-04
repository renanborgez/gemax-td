import { describe, it, expect } from 'vitest';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import { RootkitEnemy } from '@/entities/enemies/RootkitEnemy';

describe('Enemy subclasses', () => {
  it('WormEnemy initializes hp=maxHp from base.hp', () => {
    const e = new WormEnemy({
      id: 'e:1', defKind: 'worm',
      baseStats: { hp: 18, speed: 2.6, armor: 0 },
      bounty: 4, flying: false, spawnerId: 'main',
    });
    expect(e.hp).toBe(18);
    expect(e.maxHp).toBe(18);
    expect(e.kind).toBe('enemy:worm');
    expect(e.statuses).toEqual([]);
  });

  it('RootkitEnemy has independent identity', () => {
    const e = new RootkitEnemy({
      id: 'e:b', defKind: 'rootkit',
      baseStats: { hp: 800, speed: 0.8, armor: 6 },
      bounty: 80, flying: false, spawnerId: 'main',
    });
    expect(e.kind).toBe('enemy:rootkit');
  });
});
