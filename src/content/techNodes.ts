import type { TowerKind } from '@/content/types';
import type { DeepReadonly } from '@/lib/types';
import { ALL_TOWER_DEFS } from '@/content/towerDefs';

const TOWER_DISPLAY_NAME: Readonly<Record<TowerKind, string>> = Object.fromEntries(
  ALL_TOWER_DEFS.map((t) => [t.kind, t.displayName]),
) as Record<TowerKind, string>;

const STAT_DISPLAY_NAME: Readonly<Record<'damage' | 'range' | 'fireRate', string>> = {
  damage: 'Damage',
  range: 'Range',
  fireRate: 'Fire Rate',
};

export type TechCategory = TowerKind | 'global';

export type TechEffect =
  | { type: 'towerStat'; tower: TowerKind; stat: 'damage' | 'range' | 'fireRate'; mult: number }
  | { type: 'iceLanceCrit'; chance: number; mult: number }
  | { type: 'chainKill'; tower: TowerKind; chainCount: number }
  | { type: 'slowFieldOnLogicBomb'; duration: number; dotPerSecond?: number }
  | { type: 'startCreditsBonus'; amount: number }
  | { type: 'sellRebateRatio'; ratio: number }
  | { type: 'lifeRegenPerMinute'; rate: number }
  /** Rank-scaled global stat boost — applied to every tower's per-tower mult.
   *  Effective mult at rank R is `1 + perRankMult * R`. */
  | { type: 'globalTowerStatPerRank'; stat: 'damage' | 'range' | 'fireRate'; perRankMult: number }
  /** Rank-scaled start-of-match credit bonus. Effective bonus at rank R is `perRank * R`. */
  | { type: 'startCreditsPerRank'; perRank: number }
  /** Rank-scaled extra starting lives. */
  | { type: 'startLivesPerRank'; perRank: number }
  /** Rank-scaled multiplier on per-enemy bounty payouts. */
  | { type: 'bountyMultPerRank'; perRankMult: number }
  /** Rank-scaled multiplier on EMP stun duration (and future stun towers). */
  | { type: 'stunDurationMultPerRank'; perRankMult: number }
  /** Rank-scaled multiplier on end-of-match shard reward. */
  | { type: 'shardRewardMultPerRank'; perRankMult: number };

export type TechNodeDef = DeepReadonly<{
  id: string;
  category: TechCategory;
  /** Display tier within its category (1-indexed, used for UI grouping/ordering). */
  tier: number;
  displayName: string;
  description: string;
  shardCost: number;
  requires?: string;          // FK into TECH_NODES; node must be unlocked first
  effect: TechEffect;
  /** Maximum purchasable rank. Default 1 (single-tier unlock). Rank-scaled
   *  effects (`globalTowerStatPerRank`, `startCreditsPerRank`, etc.) read the
   *  rank stored in the save's `techTree` map and scale their effect linearly. */
  maxRank?: number;
}>;

const TOWER_KINDS: ReadonlyArray<TowerKind> = [
  'bullet-turret', 'machine-gun',
  'firewall', 'logic-bomb', 'ice-lance', 'sniper', 'tesla-coil', 'venom-spire', 'emp',
  'plasma-cannon', 'mortar', 'cryo-field', 'marker', 'beam-cannon', 'flamer',
];

/**
 * Builds a templated 6-talent ladder for a tower: damage / range / fireRate
 * × T1 (+5%) and T2 (+5% on top, requires T1). Foundation only — designers
 * can swap individual stubs for signature talents later.
 */
function statTalentLadder(tower: TowerKind, baseShardCost: number): TechNodeDef[] {
  const stats = ['damage', 'range', 'fireRate'] as const;
  const towerName = TOWER_DISPLAY_NAME[tower];
  const out: TechNodeDef[] = [];
  for (const stat of stats) {
    const t1Id = `${tower}-${stat}-t1`;
    const t2Id = `${tower}-${stat}-t2`;
    const statName = STAT_DISPLAY_NAME[stat];
    out.push({
      id: t1Id,
      category: tower,
      tier: 1,
      displayName: `${towerName}: ${statName} I`,
      description: `+5% ${statName.toLowerCase()}.`,
      shardCost: baseShardCost,
      effect: { type: 'towerStat', tower, stat, mult: 1.05 },
    });
    out.push({
      id: t2Id,
      category: tower,
      tier: 2,
      displayName: `${towerName}: ${statName} II`,
      description: `+10% ${statName.toLowerCase()} (replaces I).`,
      shardCost: baseShardCost * 2,
      requires: t1Id,
      effect: { type: 'towerStat', tower, stat, mult: 1.10 },
    });
  }
  return out;
}

const PER_TOWER_TALENTS: TechNodeDef[] = TOWER_KINDS.flatMap(
  (k) => statTalentLadder(k, 25),
);

const BASE_TECH_NODES: TechNodeDef[] = [
  {
    id: 'firewall-chain-t1',
    category: 'firewall',
    tier: 3,
    displayName: 'Firewall: Chain Beam I',
    description: 'Hitscan beam jumps to one extra target.',
    shardCost: 30,
    effect: { type: 'chainKill', tower: 'firewall', chainCount: 1 },
  },
  {
    id: 'firewall-chain-t2',
    category: 'firewall',
    tier: 4,
    displayName: 'Firewall: Chain Beam II',
    description: 'Hitscan beam jumps to two extra targets (replaces I).',
    shardCost: 80,
    requires: 'firewall-chain-t1',
    effect: { type: 'chainKill', tower: 'firewall', chainCount: 2 },
  },
  {
    id: 'logic-bomb-slow-t1',
    category: 'logic-bomb',
    tier: 3,
    displayName: 'Logic Bomb: Slow Field I',
    description: 'AoE pulse leaves a 2-second slow field.',
    shardCost: 30,
    effect: { type: 'slowFieldOnLogicBomb', duration: 2 },
  },
  {
    id: 'logic-bomb-slow-t2',
    category: 'logic-bomb',
    tier: 4,
    displayName: 'Logic Bomb: Slow Field II',
    description: '4-second slow field with damage-over-time (replaces I).',
    shardCost: 80,
    requires: 'logic-bomb-slow-t1',
    effect: { type: 'slowFieldOnLogicBomb', duration: 4, dotPerSecond: 4 },
  },
  {
    id: 'ice-lance-crit-t1',
    category: 'ice-lance',
    tier: 3,
    displayName: 'ICE Lance: Crit I',
    description: '25% chance to deal ×2 damage.',
    shardCost: 40,
    effect: { type: 'iceLanceCrit', chance: 0.25, mult: 2.0 },
  },
  {
    id: 'ice-lance-crit-t2',
    category: 'ice-lance',
    tier: 4,
    displayName: 'ICE Lance: Crit II',
    description: '50% chance to deal ×2 damage (replaces I).',
    shardCost: 90,
    requires: 'ice-lance-crit-t1',
    effect: { type: 'iceLanceCrit', chance: 0.5, mult: 2.0 },
  },
  {
    id: 'global-reserves',
    category: 'global',
    tier: 1,
    displayName: 'Global: Reserves',
    description: 'Start each match with +50 credits.',
    shardCost: 30,
    effect: { type: 'startCreditsBonus', amount: 50 },
  },
  {
    id: 'global-salvage',
    category: 'global',
    tier: 1,
    displayName: 'Global: Salvage',
    description: 'Sell rebate increases from 70% to 90%.',
    shardCost: 40,
    effect: { type: 'sellRebateRatio', ratio: 0.9 },
  },
  {
    id: 'global-self-heal',
    category: 'global',
    tier: 1,
    displayName: 'Global: Self-heal',
    description: 'Regenerate 1 life per minute.',
    shardCost: 60,
    effect: { type: 'lifeRegenPerMinute', rate: 1 },
  },

  // ─── Rankable global ladders ────────────────────────────────────────────
  // Each rank costs `shardCost` and scales the effect by `perRank`. Soft
  // late-game investment for accounts pushing for higher player levels.
  {
    id: 'global-damage-rank',
    category: 'global',
    tier: 2,
    displayName: 'Global: Overclock',
    description: '+1% damage on every tower per rank.',
    shardCost: 25,
    maxRank: 5,
    effect: { type: 'globalTowerStatPerRank', stat: 'damage', perRankMult: 0.01 },
  },
  {
    id: 'global-range-rank',
    category: 'global',
    tier: 2,
    displayName: 'Global: Calibration',
    description: '+1% range on every tower per rank.',
    shardCost: 25,
    maxRank: 5,
    effect: { type: 'globalTowerStatPerRank', stat: 'range', perRankMult: 0.01 },
  },
  {
    id: 'global-firerate-rank',
    category: 'global',
    tier: 2,
    displayName: 'Global: Throughput',
    description: '+1% fire rate on every tower per rank.',
    shardCost: 25,
    maxRank: 5,
    effect: { type: 'globalTowerStatPerRank', stat: 'fireRate', perRankMult: 0.01 },
  },
  {
    id: 'global-credits-rank',
    category: 'global',
    tier: 2,
    displayName: 'Global: Reserves +',
    description: '+20 starting credits per rank.',
    shardCost: 30,
    maxRank: 5,
    effect: { type: 'startCreditsPerRank', perRank: 20 },
  },
  {
    id: 'global-life-rank',
    category: 'global',
    tier: 2,
    displayName: 'Global: Bulwark',
    description: '+1 starting life per rank.',
    shardCost: 50,
    maxRank: 5,
    effect: { type: 'startLivesPerRank', perRank: 1 },
  },
  {
    id: 'global-bounty-rank',
    category: 'global',
    tier: 3,
    displayName: 'Global: Skim',
    description: '+2% bounty payout per rank.',
    shardCost: 35,
    maxRank: 5,
    effect: { type: 'bountyMultPerRank', perRankMult: 0.02 },
  },
  {
    id: 'global-stunduration-rank',
    category: 'global',
    tier: 3,
    displayName: 'Global: Disruption',
    description: '+5% stun duration per rank.',
    shardCost: 35,
    maxRank: 5,
    effect: { type: 'stunDurationMultPerRank', perRankMult: 0.05 },
  },
  {
    id: 'global-shard-rank',
    category: 'global',
    tier: 3,
    displayName: 'Global: Recovery',
    description: '+5% shard reward per rank.',
    shardCost: 40,
    maxRank: 5,
    effect: { type: 'shardRewardMultPerRank', perRankMult: 0.05 },
  },
];

export const TECH_NODES: ReadonlyArray<TechNodeDef> = [
  ...BASE_TECH_NODES,
  ...PER_TOWER_TALENTS,
];

export const TECH_NODE_BY_ID: Readonly<Record<string, TechNodeDef>> =
  Object.fromEntries(TECH_NODES.map((n) => [n.id, n]));
