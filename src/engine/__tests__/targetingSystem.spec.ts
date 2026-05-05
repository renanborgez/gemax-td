import { describe, it, expect } from 'vitest';
import { pickTarget, targetingSystem, type FireIntent } from '@/engine/systems/targetingSystem';
import { FirewallTower } from '@/entities/towers/FirewallTower';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import type { StatContext } from '@/entities/getStat';

const ctx: StatContext = { difficulty: { enemyHpMult: 1, enemySpeedMult: 1 }, effects: { towerStatMults: {} } };

function makeTower(priority: any): FirewallTower {
  return new FirewallTower({
    id: 't:1', defKind: 'firewall', level: 1,
    x: 5, y: 5, tileCoord: { col: 0, row: 0 },
    baseStats: { damage: 10, range: 5, fireRate: 1 },
    projectileKind: 'hitscan-bolt', targets: 'both', defaultTargetPriority: priority,
  });
}

function makeEnemy(id: string, x: number, y: number, hp: number, dist: number): WormEnemy {
  const e = new WormEnemy({
    id, defKind: 'worm',
    baseStats: { hp, speed: 1, armor: 0 },
    bounty: 1, flying: false, spawnerId: 'main',
  });
  e.x = x; e.y = y; e.distAlongPath = dist; e.hp = hp;
  return e;
}

describe('pickTarget', () => {
  const enemies = [
    makeEnemy('e:1', 6, 5, 10, 2),
    makeEnemy('e:2', 7, 5, 30, 5),
    makeEnemy('e:3', 4, 5, 20, 8),
  ];

  it('first = furthest along path within range', () => {
    expect(pickTarget(makeTower('first'), enemies, ctx)?.id).toBe('e:3');
  });
  it('last = least progressed along path within range', () => {
    expect(pickTarget(makeTower('last'), enemies, ctx)?.id).toBe('e:1');
  });
  it('strongest = highest hp', () => {
    expect(pickTarget(makeTower('strongest'), enemies, ctx)?.id).toBe('e:2');
  });
  it('weakest = lowest hp', () => {
    expect(pickTarget(makeTower('weakest'), enemies, ctx)?.id).toBe('e:1');
  });
  it('closest = smallest distance from tower', () => {
    expect(pickTarget(makeTower('closest'), enemies, ctx)?.id).toBe('e:1');
  });
  it('returns null when nothing in range', () => {
    const t = makeTower('first');
    t.base.range = 0.5;
    expect(pickTarget(t, enemies, ctx)).toBeNull();
  });
  it('skips dead enemies', () => {
    const dying = enemies.map((e) => Object.assign(e, {})); // shallow copies
    dying[0]!.alive = false;
    expect(pickTarget(makeTower('last'), dying, ctx)?.id).toBe('e:2');
  });
  it('respects ground/flying targets filter', () => {
    const t = makeTower('first');
    t.targets = 'flying';
    expect(pickTarget(t, enemies, ctx)).toBeNull();
  });
  it('skips untargetable enemies (e.g. wraith mid-phase)', () => {
    const skipFirst = enemies.map((e) => Object.assign(e, {}));
    skipFirst[2]!.untargetable = true; // 'first' would have picked e:3
    expect(pickTarget(makeTower('first'), skipFirst, ctx)?.id).toBe('e:2');
    skipFirst[2]!.untargetable = false;
  });
});

describe('targetingSystem', () => {
  it('emits a fire intent and sets cooldown', () => {
    const t = makeTower('first');
    const e = makeEnemy('e:1', 6, 5, 10, 1);
    const out: FireIntent[] = [];
    targetingSystem([t], [e], ctx, 1 / 60, out);
    expect(out).toHaveLength(1);
    expect(out[0]!.targetEnemyId).toBe('e:1');
    expect(t.cooldown).toBeCloseTo(1 / 1); // fireRate=1
  });
  it('does not emit while on cooldown', () => {
    const t = makeTower('first');
    const e = makeEnemy('e:1', 6, 5, 10, 1);
    t.cooldown = 0.5;
    const out: FireIntent[] = [];
    targetingSystem([t], [e], ctx, 1 / 60, out);
    expect(out).toHaveLength(0);
    expect(t.cooldown).toBeLessThan(0.5);
  });
});
