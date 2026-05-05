import { describe, it, expect } from 'vitest';
import { upgradeCost } from '@/content/towerCostFormula';
import { ALL_TOWER_DEFS } from '@/content/towerDefs';

describe('upgradeCost', () => {
  it('rounds to nearest 5', () => {
    for (const t of ALL_TOWER_DEFS) {
      for (let tier = 1; tier <= t.upgrades.length; tier++) {
        const c = upgradeCost(t.cost, tier);
        expect(c % 5, `${t.kind} tier ${tier}: ${c}`).toBe(0);
      }
    }
  });

  it('grows monotonically per tier', () => {
    for (const t of ALL_TOWER_DEFS) {
      let prev = 0;
      for (let tier = 1; tier <= t.upgrades.length; tier++) {
        const c = upgradeCost(t.cost, tier);
        expect(c).toBeGreaterThan(prev);
        prev = c;
      }
    }
  });

  it('uses growth factor 1.4: round(baseCost * 1.4^tier / 5) * 5', () => {
    expect(upgradeCost(50, 1)).toBe(70);    // 50*1.4 = 70 → 70
    expect(upgradeCost(50, 2)).toBe(100);   // 50*1.96 = 98 → 100
    expect(upgradeCost(200, 1)).toBe(280);  // 200*1.4 = 280
    expect(upgradeCost(200, 2)).toBe(390);  // 200*1.96 = 392 → 390
  });

  it('rejects invalid tier or baseCost', () => {
    expect(() => upgradeCost(50, 0)).toThrow();
    expect(() => upgradeCost(-1, 1)).toThrow();
  });
});

describe('cost-per-DPS audit (Schreiber-style)', () => {
  /**
   * Snapshot of cost-per-DPS at each tier. Lower = more cost-efficient. This
   * test documents the curve so accidental drift is visible in PR diffs.
   * Utility towers (Logic Bomb, Venom Spire) carry a cost premium for
   * AoE/DoT/CC value not captured in raw DPS.
   */
  it('matches the documented snapshot', () => {
    const rows = ALL_TOWER_DEFS.map((t) => {
      const baseDps = t.baseStats.damage * t.baseStats.fireRate;
      return {
        kind: t.kind,
        baseCostPerDps: round1(t.cost / baseDps),
      };
    });

    expect(rows).toEqual([
      { kind: 'bullet-turret', baseCostPerDps: 5.7 }, // base — cheap kinetic
      { kind: 'machine-gun',   baseCostPerDps: 7.5 }, // rapid-fire
      { kind: 'firewall',      baseCostPerDps: 5.2 },
      { kind: 'logic-bomb',    baseCostPerDps: 30.0 }, // AoE premium
      { kind: 'ice-lance',     baseCostPerDps: 7.7 },
      { kind: 'sniper',        baseCostPerDps: 8.3 },
      { kind: 'tesla-coil',    baseCostPerDps: 12.5 }, // chain premium
      { kind: 'venom-spire',   baseCostPerDps: 18.3 }, // DoT premium
      { kind: 'emp',           baseCostPerDps: 400.0 }, // utility (stun)
      { kind: 'plasma-cannon', baseCostPerDps: 5.9 }, // late-game DPS
      { kind: 'mortar',        baseCostPerDps: 31.0 }, // late-game AoE premium
      { kind: 'cryo-field',    baseCostPerDps: Infinity }, // passive aura — no DPS axis
      { kind: 'marker',        baseCostPerDps: Infinity }, // utility (debuff) — no DPS axis
      { kind: 'beam-cannon',   baseCostPerDps: 10.0 }, // base; ramp 2.5× makes effective ~4
      { kind: 'flamer',        baseCostPerDps: 13.3 }, // splash premium
    ]);
  });
});

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
