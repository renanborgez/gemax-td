import type { TowerDef } from '@/content/types';
import { FirewallTower } from '@/entities/towers/FirewallTower';
import { LogicBombTower } from '@/entities/towers/LogicBombTower';
import { ICELanceTower } from '@/entities/towers/ICELanceTower';

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
};

export const ALL_TOWER_DEFS: readonly TowerDef[] = [FIREWALL, LOGIC_BOMB, ICE_LANCE];
