import { describe, it, expect } from 'vitest';
import { TECH_NODES, TECH_NODE_BY_ID } from '@/content/techNodes';
import { ALL_TOWER_DEFS } from '@/content/towerDefs';

describe('TECH_NODES catalog', () => {
  it('node IDs are unique', () => {
    const ids = TECH_NODES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('TECH_NODE_BY_ID matches TECH_NODES', () => {
    for (const n of TECH_NODES) {
      expect(TECH_NODE_BY_ID[n.id]).toBe(n);
    }
  });

  it('every requires field references an existing node', () => {
    for (const n of TECH_NODES) {
      if (n.requires === undefined) continue;
      expect(TECH_NODE_BY_ID[n.requires], `${n.id} requires unknown ${n.requires}`).toBeDefined();
    }
  });

  it('every per-tower talent references a real tower kind', () => {
    const towerKinds = new Set(ALL_TOWER_DEFS.map((t) => t.kind));
    for (const n of TECH_NODES) {
      if (n.category === 'global') continue;
      expect(towerKinds.has(n.category), `node ${n.id} category ${n.category}`).toBe(true);
    }
  });

  it('all shardCost are positive', () => {
    for (const n of TECH_NODES) {
      expect(n.shardCost, n.id).toBeGreaterThan(0);
    }
  });

  it('catalog has the 9 base nodes documented in the spec', () => {
    const required = [
      'firewall-chain-t1', 'firewall-chain-t2',
      'logic-bomb-slow-t1', 'logic-bomb-slow-t2',
      'ice-lance-crit-t1', 'ice-lance-crit-t2',
      'global-reserves', 'global-salvage', 'global-self-heal',
    ];
    for (const id of required) {
      expect(TECH_NODE_BY_ID[id], `missing base node ${id}`).toBeDefined();
    }
  });

  it('per-tower talent ladder covers every tower with 6 nodes', () => {
    for (const t of ALL_TOWER_DEFS) {
      const talents = TECH_NODES.filter(
        (n) => n.category === t.kind && n.effect.type === 'towerStat',
      );
      expect(talents.length, `tower ${t.kind} talents`).toBe(6);
    }
  });

  it('every per-tower tier-2 talent has a requires field pointing to its tier-1', () => {
    for (const n of TECH_NODES) {
      if (n.effect.type !== 'towerStat') continue;
      if (n.tier !== 2) continue;
      expect(n.requires, `tier-2 ${n.id}`).toBeDefined();
      const prereq = n.requires!;
      const t1 = TECH_NODE_BY_ID[prereq];
      expect(t1, `prereq ${prereq}`).toBeDefined();
      expect(t1!.tier).toBe(1);
      expect(t1!.category).toBe(n.category);
    }
  });
});
