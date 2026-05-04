import { describe, it, expect } from 'vitest';
import { isUnlockable, unlock, buildEffectsContext } from '@/meta/TechTree';
import { blankSaveDataV1 } from '@/meta/schema';
import type { TechNode } from '@/content/types';

const FW1: TechNode = {
  id: 'tower.firewall.t1', category: 'tower', cost: 30, requires: [],
  effect: { kind: 'tower-behavior-chain', tower: 'firewall', chainCount: 2 },
  displayName: 'Firewall: Chain', description: '',
};
const FW2: TechNode = {
  id: 'tower.firewall.t2', category: 'tower', cost: 80, requires: ['tower.firewall.t1'],
  effect: { kind: 'tower-behavior-chain', tower: 'firewall', chainCount: 3 },
  displayName: 'Firewall: Chain T2', description: '',
};
const REGEN: TechNode = {
  id: 'global.regen', category: 'global', cost: 60, requires: [],
  effect: { kind: 'global-life-regen', perMinute: 1 },
  displayName: 'Life Regen', description: '',
};

describe('TechTree', () => {
  it('isUnlockable rejects when prereqs not met', () => {
    const save = blankSaveDataV1(); save.meta.shards = 100;
    const r = isUnlockable(FW2, save);
    expect(r.ok).toBe(false);
  });

  it('unlock spends shards and records tier', () => {
    const save = blankSaveDataV1(); save.meta.shards = 100;
    unlock(FW1, save);
    expect(save.meta.shards).toBe(70);
    expect(save.meta.techTree['tower.firewall.t1']).toBe(1);
  });

  it('higher chain tier replaces lower in EffectsContext', () => {
    const save = blankSaveDataV1(); save.meta.shards = 200;
    unlock(FW1, save); unlock(FW2, save);
    const ctx = buildEffectsContext([FW1, FW2], save);
    expect(ctx.behaviors.chainKill?.['firewall']).toBe(3);
  });

  it('global regen accumulates', () => {
    const save = blankSaveDataV1(); save.meta.shards = 100;
    unlock(REGEN, save);
    const ctx = buildEffectsContext([REGEN], save);
    expect(ctx.globals.lifeRegenPerMinute).toBe(1);
  });
});
