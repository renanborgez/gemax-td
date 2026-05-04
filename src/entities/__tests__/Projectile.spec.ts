import { describe, it, expect } from 'vitest';
import { HitscanProjectile } from '@/entities/projectiles/HitscanProjectile';
import { BallisticProjectile } from '@/entities/projectiles/BallisticProjectile';
import { AoEPulseProjectile } from '@/entities/projectiles/AoEPulseProjectile';

describe('Projectile subclasses', () => {
  const init = { id: 'p:1', kind: 'projectile:hitscan-bolt', x: 0, y: 0, damage: 8, sourceTowerId: 't:1', ttl: 0.1 };

  it('Hitscan constructs', () => {
    const p = new HitscanProjectile(init);
    expect(p.damage).toBe(8);
    expect(p.targetEnemyId).toBeNull();
  });

  it('Ballistic resetForPool clears velocity', () => {
    const p = new BallisticProjectile(init);
    p.vx = 5; p.vy = 5;
    p.resetForPool();
    expect(p.vx).toBe(0);
    expect(p.vy).toBe(0);
  });

  it('AoEPulse tracks hit enemies', () => {
    const p = new AoEPulseProjectile({ ...init, kind: 'projectile:aoe-pulse' });
    p.hitEnemyIds.add('e:1');
    expect(p.hitEnemyIds.has('e:1')).toBe(true);
    p.resetForPool();
    expect(p.hitEnemyIds.size).toBe(0);
  });
});
