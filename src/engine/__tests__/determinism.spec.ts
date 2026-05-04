import { describe, it, expect, beforeEach } from 'vitest';
import { Engine } from '@/engine/Engine';
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
    { kind: 'worm',    displayName: 'Worm',    baseStats: { hp: 18,  speed: 2.0, armor: 0 }, bounty: 4,  flying: false, classRef: WormEnemy },
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
  id: 'lvl-det', name: 'Det', chapter: 0,
  grid: { cols: 6, rows: 1, cells: [['path','path','path','path','path','path']] },
  spawners: [{ id: 'main', tile: { col: 0, row: 0 } }],
  path: [{ col: 0, row: 0 }, { col: 5, row: 0 }],
  startCredits: 200, startLives: 5,
  waves: [{ delayBeforeStart: 0, groups: [
    { id: 'g1', spawnerId: 'main', enemyKind: 'worm',    count: 4, spacing: 0.4, delay: 0 },
    { id: 'g2', spawnerId: 'main', enemyKind: 'trojan',  count: 2, spacing: 0.6, delay: 0, afterGroupId: 'g1' },
  ]}],
  starThresholds: { stars3: 5, stars2: 4, stars1: 1 },
};

function runMatch(seed: number) {
  const w = createWorld({ level, difficulty: 'normal', seed, redraw: { bump: () => {} } });
  w.entities.towers.push(new ICELanceTower({
    id: w.idGen('tower'), defKind: 'ice-lance', level: 1,
    x: 3.5, y: 0.5, tileCoord: { col: 3, row: 0 },
    baseStats: { range: 4.5, fireRate: 0.7, damage: 22 },
    projectileKind: 'ballistic-pulse', targets: 'both', defaultTargetPriority: 'strongest',
  }));
  const engine = new Engine(w, { now: () => 0, schedule: () => () => {} });
  engine.startNextWave();
  for (let i = 0; i < 60 * 30; i++) {
    engine.simStep(1 / 60);
    if (w.status !== 'playing') break;
  }
  return {
    status: w.status,
    lives: w.lives,
    credits: w.credits,
    waveCleared: w.waveDirector.waveIndex,
    enemiesAlive: w.entities.enemies.filter((e) => e.alive).length,
  };
}

describe('determinism (100 seeds)', () => {
  it('two runs of the same (level, difficulty, seed) produce identical end state', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const a = runMatch(seed);
      const b = runMatch(seed);
      expect(b).toEqual(a);
    }
  }, 30_000);
});
