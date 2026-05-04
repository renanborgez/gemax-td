import { slowMultiplier, isFrozenOrStunned } from '@/entities/StatusEffect';

/**
 * StatContext is everything getStat needs. Keep it interface-narrow so tests
 * don't have to instantiate a full World.
 */
export type StatContext = {
  difficulty: {
    enemyHpMult: number;
    enemySpeedMult: number;
  };
  effects: {
    towerStatMults: Partial<Record<string, Partial<Record<string, number>>>>;
    // example: { firewall: { damage: 1.10 } }
  };
};

type StattedTower = {
  kind: 'tower';
  defKind: string;
  base: { damage: number; range: number; fireRate: number };
};

type StattedEnemy = {
  kind: 'enemy';
  defKind: string;
  base: { hp: number; speed: number; armor: number };
  statuses: import('@/entities/StatusEffect').StatusEffect[];
};

export function getTowerStat(
  t: StattedTower,
  stat: 'damage' | 'range' | 'fireRate',
  ctx: StatContext,
): number {
  const base = t.base[stat]!;
  const mult = ctx.effects.towerStatMults[t.defKind]?.[stat] ?? 1;
  return base * mult;
}

export function getEnemyStat(
  e: StattedEnemy,
  stat: 'hp' | 'speed' | 'armor',
  ctx: StatContext,
): number {
  const base = e.base[stat]!;
  if (stat === 'hp') return base * ctx.difficulty.enemyHpMult;
  if (stat === 'armor') return base;
  // speed: difficulty mult, then statuses
  if (isFrozenOrStunned(e.statuses)) return 0;
  return base * ctx.difficulty.enemySpeedMult * slowMultiplier(e.statuses);
}
