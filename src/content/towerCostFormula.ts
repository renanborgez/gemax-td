/**
 * Tower upgrade cost is derived — never overridden per tower. Source of truth
 * for the formula. Tiers are 1-indexed (tier 1 = base→L2, tier 2 = L2→L3).
 */
const UPGRADE_GROWTH = 1.4;

export function upgradeCost(baseCost: number, tier: number): number {
  if (tier < 1) throw new Error('tier must be >= 1');
  if (baseCost < 0) throw new Error('baseCost must be >= 0');
  return Math.round((baseCost * UPGRADE_GROWTH ** tier) / 5) * 5;
}
