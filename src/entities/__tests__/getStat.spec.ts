import { describe, it, expect } from 'vitest';
import { getTowerStat, getEnemyStat, type StatContext } from '@/entities/getStat';
import { freshStatus } from '@/entities/StatusEffect';

const ctx = (over: Partial<StatContext> = {}): StatContext => ({
  difficulty: { enemyHpMult: 1, enemySpeedMult: 1, ...over.difficulty },
  effects: { towerStatMults: {}, ...over.effects },
});

describe('getTowerStat', () => {
  const t = { kind: 'tower' as const, defKind: 'firewall', base: { damage: 10, range: 3, fireRate: 1 } };

  it('returns base value when no effects', () => {
    expect(getTowerStat(t, 'damage', ctx())).toBe(10);
  });
  it('applies effect multipliers', () => {
    const c = ctx({ effects: { towerStatMults: { firewall: { damage: 1.2 } } } });
    expect(getTowerStat(t, 'damage', c)).toBeCloseTo(12);
  });
});

describe('getEnemyStat', () => {
  const e = (statuses: any[] = []) => ({
    kind: 'enemy' as const,
    defKind: 'worm',
    base: { hp: 20, speed: 2, armor: 0 },
    statuses,
  });

  it('applies enemyHpMult', () => {
    expect(getEnemyStat(e(), 'hp', ctx({ difficulty: { enemyHpMult: 1.75, enemySpeedMult: 1 } }))).toBe(35);
  });
  it('returns 0 speed if stunned/frozen', () => {
    const en = e([freshStatus({ kind: 'freeze', magnitude: 1, duration: 1, appliedByTowerId: 't' })]);
    expect(getEnemyStat(en, 'speed', ctx())).toBe(0);
  });
  it('applies slow multiplier on top of difficulty', () => {
    const en = e([freshStatus({ kind: 'slow', magnitude: 0.5, duration: 1, appliedByTowerId: 't' })]);
    const c = ctx({ difficulty: { enemyHpMult: 1, enemySpeedMult: 1.10 } });
    expect(getEnemyStat(en, 'speed', c)).toBeCloseTo(2 * 1.10 * 0.5);
  });
});
