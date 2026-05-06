import { describe, it, expect, beforeEach } from 'vitest';
import { registerTowers, getTowerDef, _resetRegistry } from '@/entities/registry';
import { FirewallTower } from '@/entities/towers/FirewallTower';

const sampleTower = {
  kind: 'firewall' as const,
  displayName: 'Firewall',
  baseStats: { range: 3.5, fireRate: 1.2, damage: 8 },
  upgrades: [],
  cost: 50,
  projectileKind: 'hitscan-bolt' as const,
  defaultTargetPriority: 'first' as const,
  targets: 'both' as const,
  classRef: FirewallTower,
  rarity: 'common' as const,
};

describe('registry', () => {
  beforeEach(() => { _resetRegistry(); });

  it('registers and retrieves a tower def', () => {
    registerTowers([sampleTower]);
    expect(getTowerDef('firewall').displayName).toBe('Firewall');
  });

  it('throws on missing tower', () => {
    expect(() => getTowerDef('firewall')).toThrowError(/not registered/);
  });

  it('replaces previous registrations', () => {
    registerTowers([sampleTower]);
    registerTowers([{ ...sampleTower, displayName: 'Replaced' }]);
    expect(getTowerDef('firewall').displayName).toBe('Replaced');
  });
});
