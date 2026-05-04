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
import { AoEPulseProjectile, LOGIC_BOMB_FLIGHT_SPEED } from '@/entities/projectiles/AoEPulseProjectile';
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
    { kind: 'firewall',   displayName: 'Firewall',   baseStats: { range: 5,    fireRate: 5,   damage: 999 }, upgrades: [], cost: 50,  projectileKind: 'hitscan-bolt',    defaultTargetPriority: 'first', targets: 'both', classRef: FirewallTower },
    { kind: 'logic-bomb', displayName: 'Logic Bomb', baseStats: { range: 2.5,  fireRate: 0.5, damage: 6   }, upgrades: [], cost: 90,  projectileKind: 'aoe-pulse',       defaultTargetPriority: 'strongest', targets: 'both', classRef: LogicBombTower },
    { kind: 'ice-lance',  displayName: 'ICE Lance',  baseStats: { range: 4.5,  fireRate: 0.7, damage: 22  }, upgrades: [], cost: 140, projectileKind: 'ballistic-pulse', defaultTargetPriority: 'strongest', targets: 'both', classRef: ICELanceTower },
  ]);
  registerProjectiles([
    { kind: 'hitscan-bolt',    ttl: 0.05, classRef: HitscanProjectile },
    { kind: 'ballistic-pulse', ttl: 2.0,  speed: 6, classRef: BallisticProjectile },
    { kind: 'aoe-pulse',       ttl: 0.4,  classRef: AoEPulseProjectile },
  ]);
});

const level: LevelDef = {
  id: 'lvl-test', name: 'Test', chapter: 0,
  grid: { cols: 5, rows: 1, cells: [['path','path','path','path','path']] },
  spawners: [{ id: 'main', tile: { col: 0, row: 0 } }],
  path: [{ col: 0, row: 0 }, { col: 4, row: 0 }],
  startCredits: 200, startLives: 5,
  waves: [{ delayBeforeStart: 0, groups: [{ id: 'g1', spawnerId: 'main', enemyKind: 'worm', count: 2, spacing: 0.5, delay: 0 }] }],
  starThresholds: { stars3: 5, stars2: 4, stars1: 1 },
};

const fakeClock = { now: () => 0, schedule: () => () => {} };

describe('Engine.simStep', () => {
  it('a worm reaches the end without towers and emits life-lost + match-lost', () => {
    // Use startLives: 1 so the first leak takes us to match-lost.
    const losingLevel: LevelDef = { ...level, startLives: 1 };
    const w = createWorld({ level: losingLevel, difficulty: 'normal', seed: 1, redraw: { bump: () => {} } });
    const engine = new Engine(w, fakeClock);
    engine.startNextWave();
    let lifeLost = 0, matchLost = 0;
    w.bus.on('life-lost', () => lifeLost++);
    w.bus.on('match-lost', () => matchLost++);
    for (let i = 0; i < 60 * 10; i++) {
      engine.simStep(1 / 60);
      if (w.status === 'lost') break;
    }
    expect(lifeLost).toBeGreaterThanOrEqual(1);
    expect(matchLost).toBe(1);
  });

  it('logic bomb flies before detonating, then deals damage on impact', () => {
    const w = createWorld({ level, difficulty: 'normal', seed: 1, redraw: { bump: () => {} } });
    // Stationary worm pushed directly onto entities.enemies (no wave system).
    // Speed=0 keeps it pinned at distAlongPath, so the bomb's captured dest stays accurate.
    const worm = new WormEnemy({
      id: w.idGen('enemy'),
      defKind: 'worm',
      baseStats: { hp: 50, speed: 0, armor: 0 },
      bounty: 0, flying: false, spawnerId: 'main',
    });
    worm.x = 2.5; worm.y = 0.5;
    worm.distAlongPath = 2;
    worm.maxHp = 50; worm.hp = 50;
    w.entities.enemies.push(worm);

    // Logic bomb placed at the start of the path, far enough that flight is observable.
    const bomb = new LogicBombTower({
      id: w.idGen('tower'), defKind: 'logic-bomb', level: 1,
      x: 0.5, y: 0.5, tileCoord: { col: 0, row: 0 },
      baseStats: { range: 10, fireRate: 5, damage: 100 },
      projectileKind: 'aoe-pulse', targets: 'both', defaultTargetPriority: 'strongest',
    });
    w.entities.towers.push(bomb);

    const engine = new Engine(w, fakeClock);

    // Frame 1: targeting fires, bomb spawns at the tower in flight phase.
    engine.simStep(1 / 60);
    const proj = w.entities.projectiles.find((p) => p.alive && p.kind === 'projectile:aoe-pulse');
    expect(proj).toBeDefined();
    const ap = proj as AoEPulseProjectile;
    expect(ap.phase).toBe('flight');
    expect(worm.hp).toBe(50);

    // Mid-flight: still in the flight phase, no damage applied yet.
    // Flight covers 2 tiles at LOGIC_BOMB_FLIGHT_SPEED (~0.286s) — step ~halfway.
    const flightFrames = Math.ceil((2 / LOGIC_BOMB_FLIGHT_SPEED) * 60);
    for (let i = 0; i < Math.floor(flightFrames / 2); i++) engine.simStep(1 / 60);
    expect(ap.phase).toBe('flight');
    expect(worm.hp).toBe(50);

    // After flight + a few detonate frames, the worm at the captured dest takes damage.
    for (let i = 0; i < flightFrames; i++) engine.simStep(1 / 60);
    expect(worm.hp).toBeLessThan(50);
  });

  it('a powerful firewall placed mid-path kills both worms — match won', () => {
    const w = createWorld({ level, difficulty: 'normal', seed: 1, redraw: { bump: () => {} } });
    const fw = new FirewallTower({
      id: w.idGen('tower'), defKind: 'firewall', level: 1,
      x: 2.5, y: 0.5, tileCoord: { col: 2, row: 0 },
      baseStats: { range: 5, fireRate: 5, damage: 999 },
      projectileKind: 'hitscan-bolt', targets: 'both', defaultTargetPriority: 'first',
    });
    w.entities.towers.push(fw);
    const engine = new Engine(w, fakeClock);
    engine.startNextWave();
    for (let i = 0; i < 60 * 10; i++) {
      engine.simStep(1 / 60);
      if (w.status === 'won' || w.status === 'lost') break;
    }
    expect(w.status).toBe('won');
    expect(w.lives).toBeGreaterThan(0);
  });
});
