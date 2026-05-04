import type { TechNode, TechEffect } from '@/content/types';
import type { SaveDataLatest } from '@/meta/schema';
import type { EffectsContext } from '@/world/World';

export type TechCatalog = readonly TechNode[];

export function isUnlockable(node: TechNode, save: SaveDataLatest): { ok: true } | { ok: false; reason: string } {
  if ((save.meta.techTree[node.id] ?? 0) > 0) return { ok: false, reason: 'already-unlocked' };
  for (const reqId of node.requires) {
    if ((save.meta.techTree[reqId] ?? 0) === 0) return { ok: false, reason: `requires:${reqId}` };
  }
  if (save.meta.shards < node.cost) return { ok: false, reason: 'not-enough-shards' };
  return { ok: true };
}

export function unlock(node: TechNode, save: SaveDataLatest): void {
  const status = isUnlockable(node, save);
  if (!status.ok) throw new Error(`cannot unlock ${node.id}: ${status.reason}`);
  save.meta.shards -= node.cost;
  save.meta.techTree[node.id] = 1;
}

export function buildEffectsContext(catalog: TechCatalog, save: SaveDataLatest): EffectsContext {
  const ctx: EffectsContext = {
    towerStatMults: {},
    behaviors: {},
    globals: { startCreditsBonus: 0, sellRebateRatio: 0.7, lifeRegenPerMinute: 0 },
  };

  for (const node of catalog) {
    if ((save.meta.techTree[node.id] ?? 0) === 0) continue;
    applyEffect(node.effect, ctx);
  }
  return ctx;
}

function applyEffect(effect: TechEffect, ctx: EffectsContext): void {
  switch (effect.kind) {
    case 'tower-behavior-chain': {
      ctx.behaviors.chainKill = ctx.behaviors.chainKill ?? {};
      ctx.behaviors.chainKill[effect.tower] =
        Math.max(ctx.behaviors.chainKill[effect.tower] ?? 0, effect.chainCount);
      break;
    }
    case 'tower-behavior-slow-field': {
      // Higher tier wins (longer duration).
      const sf = ctx.behaviors.slowFieldOnLogicBomb;
      if (!sf || sf.duration < effect.duration) {
        ctx.behaviors.slowFieldOnLogicBomb = {
          duration: effect.duration,
          ...(effect.dotPerSecond !== undefined ? { dotPerSecond: effect.dotPerSecond } : {}),
        };
      }
      break;
    }
    case 'tower-behavior-crit': {
      const c = ctx.behaviors.iceLanceCrit;
      if (!c || c.chance < effect.chance) {
        ctx.behaviors.iceLanceCrit = { chance: effect.chance, mult: effect.mult };
      }
      break;
    }
    case 'global-start-credits':
      ctx.globals.startCreditsBonus += effect.bonus;
      break;
    case 'global-sell-rebate':
      ctx.globals.sellRebateRatio = Math.max(ctx.globals.sellRebateRatio, effect.ratio);
      break;
    case 'global-life-regen':
      ctx.globals.lifeRegenPerMinute += effect.perMinute;
      break;
  }
}
