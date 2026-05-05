import type { TowerDef } from '@/content/types';
import { FirewallTower } from '@/entities/towers/FirewallTower';
import { LogicBombTower } from '@/entities/towers/LogicBombTower';
import { ICELanceTower } from '@/entities/towers/ICELanceTower';
import { SniperTower } from '@/entities/towers/SniperTower';
import { TeslaCoilTower } from '@/entities/towers/TeslaCoilTower';
import { VenomSpireTower } from '@/entities/towers/VenomSpireTower';

export const FIREWALL: TowerDef = {
  kind: 'firewall',
  displayName: 'Laser',
  baseStats: { range: 3.5, fireRate: 1.2, damage: 8 },
  upgrades: [
    { range: 4.0, fireRate: 1.4, damage: 12, cost: 60 },
    { range: 4.5, fireRate: 1.7, damage: 18, cost: 110 },
  ],
  cost: 50,
  projectileKind: 'hitscan-bolt',
  defaultTargetPriority: 'first',
  targets: 'both',
  classRef: FirewallTower,
  description: 'Continuous hitscan beam. Reliable single-target chip damage.',
};

export const LOGIC_BOMB: TowerDef = {
  kind: 'logic-bomb',
  displayName: 'Logic Bomb',
  baseStats: { range: 2.5, fireRate: 0.5, damage: 6 },
  upgrades: [
    { range: 3.0, fireRate: 0.6, damage: 10, cost: 100 },
    { range: 3.4, fireRate: 0.8, damage: 16, cost: 180 },
  ],
  cost: 90,
  projectileKind: 'aoe-pulse',
  defaultTargetPriority: 'strongest',
  targets: 'both',
  classRef: LogicBombTower,
  description: 'Lobs an AoE pulse that detonates over a radius. Strong against clusters.',
};

export const ICE_LANCE: TowerDef = {
  kind: 'ice-lance',
  displayName: 'ICE Lance',
  baseStats: { range: 4.5, fireRate: 0.7, damage: 22 },
  upgrades: [
    { range: 5.0, fireRate: 0.85, damage: 32, cost: 160 },
    { range: 5.5, fireRate: 1.0, damage: 50, cost: 280 },
  ],
  cost: 140,
  projectileKind: 'ballistic-pulse',
  defaultTargetPriority: 'strongest',
  targets: 'both',
  classRef: ICELanceTower,
  description: 'Heavy ballistic shard that briefly freezes its target on hit.',
  unlockCost: 40,
};

export const SNIPER: TowerDef = {
  kind: 'sniper',
  displayName: 'Sniper',
  baseStats: { range: 8.0, fireRate: 0.4, damage: 60 },
  upgrades: [
    { range: 9.0, fireRate: 0.5, damage: 95, cost: 200 },
    { range: 10.0, fireRate: 0.6, damage: 160, cost: 360 },
  ],
  cost: 200,
  projectileKind: 'tracer-round',
  defaultTargetPriority: 'strongest',
  targets: 'both',
  classRef: SniperTower,
  description: 'Long-range tracer round. Slow fire, devastating single-target damage.',
  unlockCost: 60,
};

export const TESLA_COIL: TowerDef = {
  kind: 'tesla-coil',
  displayName: 'Tesla Coil',
  baseStats: { range: 3.5, fireRate: 1.0, damage: 14 },
  upgrades: [
    { range: 4.0, fireRate: 1.2, damage: 22, cost: 180 },
    { range: 4.5, fireRate: 1.4, damage: 34, cost: 320 },
  ],
  cost: 175,
  projectileKind: 'chain-arc',
  defaultTargetPriority: 'closest',
  targets: 'both',
  classRef: TeslaCoilTower,
  description: 'Chains lightning between nearby enemies with damage falloff per jump.',
  unlockCost: 80,
};

export const VENOM_SPIRE: TowerDef = {
  kind: 'venom-spire',
  displayName: 'Venom Spire',
  baseStats: { range: 4.0, fireRate: 1.5, damage: 4 },
  upgrades: [
    { range: 4.5, fireRate: 1.8, damage: 6, cost: 130 },
    { range: 5.0, fireRate: 2.2, damage: 9, cost: 240 },
  ],
  cost: 110,
  projectileKind: 'poison-dart',
  defaultTargetPriority: 'first',
  targets: 'both',
  classRef: VenomSpireTower,
  description: 'Fires fast poison darts. Low impact damage, heavy DoT that stacks.',
  unlockCost: 50,
};

export const ALL_TOWER_DEFS: readonly TowerDef[] = [
  FIREWALL, LOGIC_BOMB, ICE_LANCE, SNIPER, TESLA_COIL, VENOM_SPIRE,
];
