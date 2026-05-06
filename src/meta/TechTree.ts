import type { EffectsContext } from '@/world/World';
import { NULL_EFFECTS } from '@/world/World';
import { TECH_NODES, TECH_NODE_BY_ID, type TechNodeDef } from '@/content/techNodes';
import { ALL_TOWER_DEFS } from '@/content/towerDefs';

export function isUnlocked(
  techTree: Readonly<Record<string, number>>,
  nodeId: string,
): boolean {
  return (techTree[nodeId] ?? 0) >= 1;
}

export function buildEffectsContext(
  techTree: Readonly<Record<string, number>>,
): EffectsContext {
  const ctx: EffectsContext = {
    towerStatMults: {},
    behaviors: {},
    globals: { ...NULL_EFFECTS.globals },
  };

  // Walk the full requires chain so a 3+ tier ladder still suppresses every
  // earlier tier when only the highest is unlocked, even if intermediate
  // tiers are also unlocked or skipped via save state.
  const supersededIds = new Set<string>();
  for (const node of TECH_NODES) {
    if (!isUnlocked(techTree, node.id)) continue;
    let cur: TechNodeDef | undefined = node;
    while (cur?.requires) {
      supersededIds.add(cur.requires);
      cur = TECH_NODE_BY_ID[cur.requires];
    }
  }

  for (const node of TECH_NODES) {
    const rank = techTree[node.id] ?? 0;
    if (rank < 1) continue;
    if (supersededIds.has(node.id)) continue;
    applyNode(ctx, node, rank);
  }

  return ctx;
}

function applyNode(ctx: EffectsContext, node: TechNodeDef, rank: number): void {
  const e = node.effect;
  // Cap rank at maxRank if defined; older saves with stale higher ranks should
  // not unbalance the match.
  const effectiveRank = node.maxRank ? Math.min(rank, node.maxRank) : rank;
  switch (e.type) {
    case 'towerStat': {
      const towerMults = (ctx.towerStatMults[e.tower] ??= {});
      const prev = towerMults[e.stat] ?? 1;
      towerMults[e.stat] = prev * e.mult;
      break;
    }
    case 'iceLanceCrit':
      ctx.behaviors.iceLanceCrit = { chance: e.chance, mult: e.mult };
      break;
    case 'chainKill': {
      const cur = ctx.behaviors.chainKill ?? {};
      cur[e.tower] = e.chainCount;
      ctx.behaviors.chainKill = cur;
      break;
    }
    case 'slowFieldOnLogicBomb':
      ctx.behaviors.slowFieldOnLogicBomb = e.dotPerSecond !== undefined
        ? { duration: e.duration, dotPerSecond: e.dotPerSecond }
        : { duration: e.duration };
      break;
    case 'startCreditsBonus':
      ctx.globals.startCreditsBonus += e.amount;
      break;
    case 'sellRebateRatio':
      ctx.globals.sellRebateRatio = e.ratio;
      break;
    case 'lifeRegenPerMinute':
      ctx.globals.lifeRegenPerMinute = e.rate;
      break;
    case 'globalTowerStatPerRank': {
      // Multiply every tower's per-stat mult by 1 + perRank * rank.
      const totalMult = 1 + e.perRankMult * effectiveRank;
      for (const t of ALL_TOWER_DEFS) {
        const towerMults = (ctx.towerStatMults[t.kind] ??= {});
        const prev = towerMults[e.stat] ?? 1;
        towerMults[e.stat] = prev * totalMult;
      }
      break;
    }
    case 'startCreditsPerRank':
      ctx.globals.startCreditsBonus += e.perRank * effectiveRank;
      break;
    case 'startLivesPerRank':
      ctx.globals.startLivesBonus += e.perRank * effectiveRank;
      break;
    case 'bountyMultPerRank':
      ctx.globals.bountyMult *= 1 + e.perRankMult * effectiveRank;
      break;
    case 'stunDurationMultPerRank':
      ctx.globals.stunDurationMult *= 1 + e.perRankMult * effectiveRank;
      break;
    case 'shardRewardMultPerRank':
      ctx.globals.shardRewardMult *= 1 + e.perRankMult * effectiveRank;
      break;
  }
}
