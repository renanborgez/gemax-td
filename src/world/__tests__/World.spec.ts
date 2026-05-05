import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld } from '@/world/World';
import { _resetRegistry, registerEnemies, registerProjectiles, registerTowers } from '@/entities/registry';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import { TrojanEnemy } from '@/entities/enemies/TrojanEnemy';
import { DaemonEnemy } from '@/entities/enemies/DaemonEnemy';
import { RootkitEnemy } from '@/entities/enemies/RootkitEnemy';
import { FirewallTower } from '@/entities/towers/FirewallTower';
import { LogicBombTower } from '@/entities/towers/LogicBombTower';
import { ICELanceTower } from '@/entities/towers/ICELanceTower';
import { HitscanProjectile } from '@/entities/projectiles/HitscanProjectile';
import { BallisticProjectile } from '@/entities/projectiles/BallisticProjectile';
import { AoEPulseProjectile } from '@/entities/projectiles/AoEPulseProjectile';
import type { LevelDef } from '@/content/types';

beforeEach(() => {
  _resetRegistry();
  registerEnemies([
    { kind: 'worm',    displayName: 'Worm',    baseStats: { hp: 18,  speed: 2.6, armor: 0 }, bounty: 4,  flying: false, classRef: WormEnemy },
    { kind: 'trojan',  displayName: 'Trojan',  baseStats: { hp: 50,  speed: 1.6, armor: 1 }, bounty: 9,  flying: false, classRef: TrojanEnemy },
    { kind: 'daemon',  displayName: 'Daemon',  baseStats: { hp: 130, speed: 1.0, armor: 4 }, bounty: 18, flying: false, classRef: DaemonEnemy },
    { kind: 'rootkit', displayName: 'Rootkit', baseStats: { hp: 800, speed: 0.8, armor: 6 }, bounty: 80, flying: false, classRef: RootkitEnemy },
  ]);
  registerTowers([
    { kind: 'firewall',   displayName: 'Firewall',   baseStats: { range: 3.5, fireRate: 1.2, damage: 8 },  upgrades: [], cost: 50,  projectileKind: 'hitscan-bolt',    defaultTargetPriority: 'first', targets: 'both', classRef: FirewallTower },
    { kind: 'logic-bomb', displayName: 'Logic Bomb', baseStats: { range: 2.5, fireRate: 0.5, damage: 6 },  upgrades: [], cost: 90,  projectileKind: 'aoe-pulse',       defaultTargetPriority: 'strongest', targets: 'both', classRef: LogicBombTower },
    { kind: 'ice-lance',  displayName: 'ICE Lance',  baseStats: { range: 4.5, fireRate: 0.7, damage: 22 }, upgrades: [], cost: 140, projectileKind: 'ballistic-pulse', defaultTargetPriority: 'strongest', targets: 'both', classRef: ICELanceTower },
  ]);
  registerProjectiles([
    { kind: 'hitscan-bolt',    ttl: 0.05, classRef: HitscanProjectile },
    { kind: 'ballistic-pulse', ttl: 2.0,  speed: 6, classRef: BallisticProjectile },
    { kind: 'aoe-pulse',       ttl: 0.4,  classRef: AoEPulseProjectile },
  ]);
});

const level: LevelDef = {
  id: 'lvl-test', name: 'Test', chapter: 0,
  grid: { cols: 3, rows: 3, cells: [['path','path','path'],['buildable','buildable','buildable'],['path','path','path']] },
  spawners: [{ id: 'main', tile: { col: 0, row: 0 } }],
  path: [{ col: 0, row: 0 }, { col: 2, row: 0 }],
  startCredits: 100, startLives: 10,
  waves: [{ delayBeforeStart: 1, groups: [{ id: 'g1', spawnerId: 'main', enemyKind: 'worm', count: 3, spacing: 0.5, delay: 0 }] }],
  starThresholds: { stars3: 10, stars2: 8, stars1: 1 },
};

describe('createWorld', () => {
  it('initializes status, lives, credits with selector + globals applied', () => {
    const w = createWorld({
      level, difficulty: 'easy', seed: 1,
      redraw: { bump: () => {} },
    });
    expect(w.status).toBe('preparing');
    expect(w.lives).toBe(10);
    // easy: startCredits ×1.15 = 115
    expect(w.credits).toBe(115);
  });
  it('respects effects.globals.startCreditsBonus', () => {
    const w = createWorld({
      level, difficulty: 'normal', seed: 1,
      effects: {
        towerStatMults: {},
        behaviors: {},
        globals: {
          startCreditsBonus: 50, startLivesBonus: 0,
          sellRebateRatio: 0.7, lifeRegenPerMinute: 0,
          bountyMult: 1, stunDurationMult: 1, shardRewardMult: 1, xpRewardMult: 1,
        },
      },
      redraw: { bump: () => {} },
    });
    expect(w.credits).toBe(150);
  });
});
