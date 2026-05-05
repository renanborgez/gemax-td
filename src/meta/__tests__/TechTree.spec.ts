import { describe, it, expect } from 'vitest';
import { buildEffectsContext, isUnlocked } from '@/meta/TechTree';

describe('isUnlocked', () => {
  it('returns false when the node is missing or 0', () => {
    expect(isUnlocked({}, 'foo')).toBe(false);
    expect(isUnlocked({ foo: 0 }, 'foo')).toBe(false);
  });
  it('returns true when the node has tier >= 1', () => {
    expect(isUnlocked({ foo: 1 }, 'foo')).toBe(true);
    expect(isUnlocked({ foo: 5 }, 'foo')).toBe(true);
  });
});

describe('buildEffectsContext', () => {
  it('empty tech tree → identity (matches NULL_EFFECTS)', () => {
    const ctx = buildEffectsContext({});
    expect(ctx.towerStatMults).toEqual({});
    expect(ctx.behaviors).toEqual({});
    expect(ctx.globals.startCreditsBonus).toBe(0);
    expect(ctx.globals.sellRebateRatio).toBe(0.7);
    expect(ctx.globals.lifeRegenPerMinute).toBe(0);
  });

  it('Global: Reserves bumps startCreditsBonus by 50', () => {
    const ctx = buildEffectsContext({ 'global-reserves': 1 });
    expect(ctx.globals.startCreditsBonus).toBe(50);
  });

  it('Global: Salvage raises sellRebateRatio to 0.9', () => {
    const ctx = buildEffectsContext({ 'global-salvage': 1 });
    expect(ctx.globals.sellRebateRatio).toBe(0.9);
  });

  it('ICE Lance crit T1 + T2 unlocked: T2 supersedes T1 (50% / ×2)', () => {
    const ctx = buildEffectsContext({
      'ice-lance-crit-t1': 1,
      'ice-lance-crit-t2': 1,
    });
    expect(ctx.behaviors.iceLanceCrit).toEqual({ chance: 0.5, mult: 2.0 });
  });

  it('Firewall chain T1 only: chainCount = 1', () => {
    const ctx = buildEffectsContext({ 'firewall-chain-t1': 1 });
    expect(ctx.behaviors.chainKill?.['firewall']).toBe(1);
  });

  it('Firewall chain T2 supersedes T1: chainCount = 2', () => {
    const ctx = buildEffectsContext({
      'firewall-chain-t1': 1,
      'firewall-chain-t2': 1,
    });
    expect(ctx.behaviors.chainKill?.['firewall']).toBe(2);
  });

  it('Per-tower stat talent T2 supersedes T1: 1.10 not 1.05*1.10', () => {
    const ctx = buildEffectsContext({
      'firewall-damage-t1': 1,
      'firewall-damage-t2': 1,
    });
    expect(ctx.towerStatMults['firewall']?.['damage']).toBeCloseTo(1.10);
  });

  it('Per-tower talent T1 alone applies 1.05', () => {
    const ctx = buildEffectsContext({ 'firewall-damage-t1': 1 });
    expect(ctx.towerStatMults['firewall']?.['damage']).toBeCloseTo(1.05);
  });

  it('T2 alone (T1 missing in save) still supersedes T1 cleanly', () => {
    // Walks the requires chain regardless of whether the prerequisite is in
    // the save. Defends against a future 3+ tier ladder where T3 unlocks
    // could otherwise leave T1's effect lingering.
    const ctx = buildEffectsContext({ 'firewall-damage-t2': 1 });
    expect(ctx.towerStatMults['firewall']?.['damage']).toBeCloseTo(1.10);
  });

  it('Different stats stack independently for the same tower', () => {
    const ctx = buildEffectsContext({
      'firewall-damage-t1': 1,
      'firewall-range-t1': 1,
    });
    expect(ctx.towerStatMults['firewall']?.['damage']).toBeCloseTo(1.05);
    expect(ctx.towerStatMults['firewall']?.['range']).toBeCloseTo(1.05);
  });

  describe('rankable globals', () => {
    it('Global: Overclock at rank 5 gives every tower +5% damage', () => {
      const ctx = buildEffectsContext({ 'global-damage-rank': 5 });
      // Match the per-tower mult for at least three known towers; verify rank-5 mult.
      expect(ctx.towerStatMults['firewall']?.['damage']).toBeCloseTo(1.05);
      expect(ctx.towerStatMults['sniper']?.['damage']).toBeCloseTo(1.05);
      expect(ctx.towerStatMults['emp']?.['damage']).toBeCloseTo(1.05);
    });

    it('Global: Overclock stacks with per-tower talents (multiplicative)', () => {
      const ctx = buildEffectsContext({
        'global-damage-rank': 3,           // +3%
        'firewall-damage-t1': 1,           // +5%
      });
      expect(ctx.towerStatMults['firewall']?.['damage']).toBeCloseTo(1.03 * 1.05);
    });

    it('caps the applied rank at maxRank when the save stores a higher number', () => {
      const ctx = buildEffectsContext({ 'global-damage-rank': 999 });
      expect(ctx.towerStatMults['firewall']?.['damage']).toBeCloseTo(1.05); // 5 ranks
    });

    it('Global: Reserves+ at rank 5 adds 100 starting credits (in addition to Reserves)', () => {
      const ctx = buildEffectsContext({
        'global-credits-rank': 5,
        'global-reserves': 1,
      });
      expect(ctx.globals.startCreditsBonus).toBe(20 * 5 + 50);
    });

    it('Global: Bulwark at rank 3 grants +3 starting lives', () => {
      const ctx = buildEffectsContext({ 'global-life-rank': 3 });
      expect(ctx.globals.startLivesBonus).toBe(3);
    });

    it('rank 0 (unpurchased) has no effect', () => {
      const ctx = buildEffectsContext({ 'global-damage-rank': 0 });
      expect(ctx.towerStatMults['firewall']?.['damage']).toBeUndefined();
      expect(ctx.globals.startLivesBonus).toBe(0);
    });

    it('Global: Skim at rank 5 gives +10% bounty', () => {
      const ctx = buildEffectsContext({ 'global-bounty-rank': 5 });
      expect(ctx.globals.bountyMult).toBeCloseTo(1.10);
    });

    it('Global: Disruption at rank 5 gives +25% stun duration', () => {
      const ctx = buildEffectsContext({ 'global-stunduration-rank': 5 });
      expect(ctx.globals.stunDurationMult).toBeCloseTo(1.25);
    });

    it('Global: Recovery at rank 5 gives +25% shard reward', () => {
      const ctx = buildEffectsContext({ 'global-shard-rank': 5 });
      expect(ctx.globals.shardRewardMult).toBeCloseTo(1.25);
    });

    it('Global: Telemetry at rank 5 gives +25% XP reward', () => {
      const ctx = buildEffectsContext({ 'global-xp-rank': 5 });
      expect(ctx.globals.xpRewardMult).toBeCloseTo(1.25);
    });

    it('rankable globals all default to 1.0 when no node is purchased', () => {
      const ctx = buildEffectsContext({});
      expect(ctx.globals.bountyMult).toBe(1);
      expect(ctx.globals.stunDurationMult).toBe(1);
      expect(ctx.globals.shardRewardMult).toBe(1);
      expect(ctx.globals.xpRewardMult).toBe(1);
    });
  });
});
