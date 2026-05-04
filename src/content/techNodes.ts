import type { TechNode } from '@/content/types';

export const TECH_NODES: readonly TechNode[] = [
  // Laser (kind: firewall — internal id retained for save compatibility)
  {
    id: 'tower.firewall.t1', category: 'tower', cost: 30, requires: [],
    effect: { kind: 'tower-behavior-chain', tower: 'firewall', chainCount: 2 },
    displayName: 'Laser: Chain Strike',
    description: 'On kill, chain to a 2nd target within range.',
  },
  {
    id: 'tower.firewall.t2', category: 'tower', cost: 80, requires: ['tower.firewall.t1'],
    effect: { kind: 'tower-behavior-chain', tower: 'firewall', chainCount: 3 },
    displayName: 'Laser: Chain Strike+',
    description: 'Chain extends to a 3rd target on kill.',
  },
  // Logic Bomb
  {
    id: 'tower.logic-bomb.t1', category: 'tower', cost: 30, requires: [],
    effect: { kind: 'tower-behavior-slow-field', tower: 'logic-bomb', duration: 2 },
    displayName: 'Logic Bomb: Slow Field',
    description: 'Detonations leave a 2-second slow field.',
  },
  {
    id: 'tower.logic-bomb.t2', category: 'tower', cost: 80, requires: ['tower.logic-bomb.t1'],
    effect: { kind: 'tower-behavior-slow-field', tower: 'logic-bomb', duration: 4, dotPerSecond: 4 },
    displayName: 'Logic Bomb: Toxic Field',
    description: 'Slow field lasts 4 seconds and deals damage over time.',
  },
  // ICE Lance
  {
    id: 'tower.ice-lance.t1', category: 'tower', cost: 40, requires: [],
    effect: { kind: 'tower-behavior-crit', tower: 'ice-lance', chance: 0.25, mult: 2 },
    displayName: 'ICE Lance: Critical Hit',
    description: '25% chance to deal double damage.',
  },
  {
    id: 'tower.ice-lance.t2', category: 'tower', cost: 90, requires: ['tower.ice-lance.t1'],
    effect: { kind: 'tower-behavior-crit', tower: 'ice-lance', chance: 0.5, mult: 2 },
    displayName: 'ICE Lance: Hot Path',
    description: '50% crit chance.',
  },
  // Globals
  {
    id: 'global.reserves', category: 'global', cost: 30, requires: [],
    effect: { kind: 'global-start-credits', bonus: 50 },
    displayName: 'Reserves',
    description: '+50 starting credits per match.',
  },
  {
    id: 'global.salvage', category: 'global', cost: 40, requires: [],
    effect: { kind: 'global-sell-rebate', ratio: 0.9 },
    displayName: 'Salvage Protocols',
    description: 'Sell rebate increased to 90%.',
  },
  {
    id: 'global.self-heal', category: 'global', cost: 60, requires: [],
    effect: { kind: 'global-life-regen', perMinute: 1 },
    displayName: 'Self-Heal Subnet',
    description: 'Regenerate 1 life per minute (capped at start lives).',
  },
];
