import { describe, it, expect, vi } from 'vitest';
import { damageSystem } from '@/engine/systems/damageSystem';
import { EventBus } from '@/engine/EventBus';
import { WormEnemy } from '@/entities/enemies/WormEnemy';

function worm(armor = 0): WormEnemy {
  return new WormEnemy({
    id: 'e:1', defKind: 'worm',
    baseStats: { hp: 20, speed: 1, armor },
    bounty: 4, flying: false, spawnerId: 'main',
  });
}

describe('damageSystem', () => {
  it('applies damage and updates lastDamagedBy', () => {
    const e = worm();
    const bus = new EventBus<any>();
    damageSystem([e], [{ targetEnemyId: 'e:1', damage: 5, attackerTowerId: 't:1' }], bus);
    expect(e.hp).toBe(15);
    expect(e.lastDamagedBy).toBe('t:1');
  });

  it('reduces by armor with floor of 1', () => {
    const e = worm(50);
    const bus = new EventBus<any>();
    damageSystem([e], [{ targetEnemyId: 'e:1', damage: 5, attackerTowerId: 't:1' }], bus);
    expect(e.hp).toBe(19);
  });

  it('emits enemy-died on lethal damage', () => {
    const e = worm();
    const bus = new EventBus<any>();
    const fn = vi.fn();
    bus.on('enemy-died', fn);
    damageSystem([e], [{ targetEnemyId: 'e:1', damage: 999, attackerTowerId: 't:1' }], bus);
    bus.flush();
    expect(e.alive).toBe(false);
    expect(fn).toHaveBeenCalledWith({ enemyId: 'e:1', bounty: 4, killedByTowerId: 't:1' });
  });

  it('ignores damage to unknown or dead enemies', () => {
    const e = worm(); e.alive = false;
    const bus = new EventBus<any>();
    damageSystem([e], [
      { targetEnemyId: 'e:1', damage: 10, attackerTowerId: 't:1' },
      { targetEnemyId: 'unknown', damage: 10, attackerTowerId: 't:2' },
    ], bus);
    expect(e.hp).toBe(20);
  });
});
