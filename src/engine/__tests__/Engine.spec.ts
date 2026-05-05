import { describe, it, expect, beforeEach } from 'vitest';
import { Engine } from '@/engine/Engine';
import { createWorld } from '@/world/World';
import { _resetRegistry, registerEnemies, registerProjectiles, registerTowers } from '@/entities/registry';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import { TrojanEnemy } from '@/entities/enemies/TrojanEnemy';
import { DaemonEnemy } from '@/entities/enemies/DaemonEnemy';
import { RootkitEnemy } from '@/entities/enemies/RootkitEnemy';
import { HypervisorEnemy } from '@/entities/enemies/HypervisorEnemy';
import { KernelghostEnemy } from '@/entities/enemies/KernelghostEnemy';
import { FirewallTower } from '@/entities/towers/FirewallTower';
import { LogicBombTower } from '@/entities/towers/LogicBombTower';
import { ICELanceTower } from '@/entities/towers/ICELanceTower';
import { EMPTower } from '@/entities/towers/EMPTower';
import { HitscanProjectile } from '@/entities/projectiles/HitscanProjectile';
import { BallisticProjectile } from '@/entities/projectiles/BallisticProjectile';
import { AoEPulseProjectile, LOGIC_BOMB_FLIGHT_SPEED } from '@/entities/projectiles/AoEPulseProjectile';
import { EMPBurstProjectile } from '@/entities/projectiles/EMPBurstProjectile';
import type { LevelDef } from '@/content/types';

beforeEach(() => {
  _resetRegistry();
  registerEnemies([
    { kind: 'worm',    displayName: 'Worm',    baseStats: { hp: 18,  speed: 2.0, armor: 0 }, bounty: 4,  flying: false, classRef: WormEnemy },
    { kind: 'trojan',  displayName: 'Trojan',  baseStats: { hp: 50,  speed: 1.6, armor: 1 }, bounty: 9,  flying: false, classRef: TrojanEnemy },
    { kind: 'daemon',  displayName: 'Daemon',  baseStats: { hp: 130, speed: 1.0, armor: 4 }, bounty: 18, flying: false, classRef: DaemonEnemy },
    { kind: 'rootkit', displayName: 'Rootkit', baseStats: { hp: 800, speed: 0.8, armor: 6 }, bounty: 80, flying: false, classRef: RootkitEnemy },
    { kind: 'hypervisor', displayName: 'Hypervisor', baseStats: { hp: 2000, speed: 0.7, armor: 10 }, bounty: 240, flying: false, classRef: HypervisorEnemy,
      special: { type: 'deathSpawn', enemyKind: 'trojan', count: 2 } },
    { kind: 'kernelghost', displayName: 'Kernelghost', baseStats: { hp: 3000, speed: 0.9, armor: 8 }, bounty: 400, flying: false, classRef: KernelghostEnemy,
      special: { type: 'healAura', radius: 1.5, hpPerSec: 6 } },
  ]);
  registerTowers([
    { kind: 'firewall',   displayName: 'Firewall',   baseStats: { range: 5,    fireRate: 5,   damage: 999 }, upgrades: [], cost: 50,  projectileKind: 'hitscan-bolt',    defaultTargetPriority: 'first', targets: 'both', classRef: FirewallTower },
    { kind: 'logic-bomb', displayName: 'Logic Bomb', baseStats: { range: 2.5,  fireRate: 0.5, damage: 6   }, upgrades: [], cost: 90,  projectileKind: 'aoe-pulse',       defaultTargetPriority: 'strongest', targets: 'both', classRef: LogicBombTower },
    { kind: 'ice-lance',  displayName: 'ICE Lance',  baseStats: { range: 4.5,  fireRate: 0.7, damage: 22  }, upgrades: [], cost: 140, projectileKind: 'ballistic-pulse', defaultTargetPriority: 'strongest', targets: 'both', classRef: ICELanceTower },
    { kind: 'emp',        displayName: 'EMP',        baseStats: { range: 3.0,  fireRate: 1.0, damage: 1   }, upgrades: [], cost: 160, projectileKind: 'emp-burst',       defaultTargetPriority: 'closest', targets: 'both', classRef: EMPTower },
  ]);
  registerProjectiles([
    { kind: 'hitscan-bolt',    ttl: 0.05, classRef: HitscanProjectile },
    { kind: 'ballistic-pulse', ttl: 2.0,  speed: 6, classRef: BallisticProjectile },
    { kind: 'aoe-pulse',       ttl: 0.4,  classRef: AoEPulseProjectile },
    { kind: 'emp-burst',       ttl: 0.45, classRef: EMPBurstProjectile },
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

  it('EMP burst applies stun status to every targetable enemy in stunRadius', () => {
    const w = createWorld({ level, difficulty: 'normal', seed: 1, redraw: { bump: () => {} } });
    // Three worms in a row across the path. EMP placed at row 0; stunRadius 2.5
    // covers w1 (1.5 tiles away) and w2 (2.5 tiles away), excludes w3 (3.5 away).
    const placeWorm = (id: string, x: number) => {
      const e = new WormEnemy({
        id, defKind: 'worm',
        baseStats: { hp: 50, speed: 0, armor: 0 },
        bounty: 0, flying: false, spawnerId: 'main',
      });
      e.x = x; e.y = 0.5;
      e.distAlongPath = x;
      e.maxHp = 50; e.hp = 50;
      w.entities.enemies.push(e);
      return e;
    };
    const w1 = placeWorm('e1', 2);   // 1.5 tiles from emp.x = 0.5
    const w2 = placeWorm('e2', 3);   // 2.5 tiles
    const w3 = placeWorm('e3', 4);   // 3.5 tiles — outside stunRadius

    const emp = new EMPTower({
      id: w.idGen('tower'), defKind: 'emp', level: 1,
      x: 0.5, y: 0.5, tileCoord: { col: 0, row: 0 },
      baseStats: { range: 5, fireRate: 5, damage: 0 },
      projectileKind: 'emp-burst', targets: 'both', defaultTargetPriority: 'closest',
    });
    w.entities.towers.push(emp);

    const engine = new Engine(w, fakeClock);
    engine.simStep(1 / 60);

    expect(w1.statuses.some((s) => s.kind === 'stun')).toBe(true);
    expect(w2.statuses.some((s) => s.kind === 'stun')).toBe(true);
    expect(w3.statuses.some((s) => s.kind === 'stun')).toBe(false);

    // Visual ring spawned and starts expanding.
    const ring = w.entities.projectiles.find(
      (p) => p.alive && p.kind === 'projectile:emp-burst',
    ) as EMPBurstProjectile | undefined;
    expect(ring).toBeDefined();
    expect(ring!.radius).toBeCloseTo(emp.stunRadius);
  });

  it('hypervisor death-spawn: killing one hypervisor adds two trojans at its position', () => {
    const w = createWorld({ level, difficulty: 'normal', seed: 1, redraw: { bump: () => {} } });
    const boss = new HypervisorEnemy({
      id: w.idGen('enemy'), defKind: 'hypervisor',
      baseStats: { hp: 50, speed: 0, armor: 0 },
      bounty: 0, flying: false, spawnerId: 'main',
    });
    boss.x = 2; boss.y = 0.5;
    boss.distAlongPath = 2;
    // Pre-kill the boss before stepping; Engine.simStep clears `staged.damage`
    // mid-tick before re-populating, so we can't push a damage event in.
    boss.maxHp = 50; boss.hp = 0; boss.alive = false; boss.lastDamagedBy = 't:dummy';
    w.entities.enemies.push(boss);
    const engine = new Engine(w, fakeClock);

    // One tick is enough to walk the death-spawn block.
    engine.simStep(1 / 60);

    const trojans = w.entities.enemies.filter((e) => e.alive && e.defKind === 'trojan');
    expect(trojans).toHaveLength(2);
    for (const t of trojans) {
      expect(t.x).toBeCloseTo(boss.x);
      expect(t.distAlongPath).toBeCloseTo(boss.distAlongPath);
    }

    // A second tick must NOT spawn additional trojans (deathSpecialApplied flag).
    engine.simStep(1 / 60);
    expect(w.entities.enemies.filter((e) => e.alive && e.defKind === 'trojan')).toHaveLength(2);
  });

  it('kernelghost heal-aura: nearby damaged enemy regenerates over time', () => {
    const w = createWorld({ level, difficulty: 'normal', seed: 1, redraw: { bump: () => {} } });
    // Place enemies via distAlongPath; movementSystem rewrites x/y from the
    // path each tick so direct (x, y) sets get clobbered. Speed=0 keeps them
    // in place along the path. Path is (0,0)→(4,0), length 4.
    const ghost = new KernelghostEnemy({
      id: w.idGen('enemy'), defKind: 'kernelghost',
      baseStats: { hp: 1000, speed: 0, armor: 0 },
      bounty: 0, flying: false, spawnerId: 'main',
    });
    ghost.distAlongPath = 2; ghost.x = 2; ghost.y = 0;
    ghost.maxHp = 1000; ghost.hp = 1000;
    w.entities.enemies.push(ghost);

    // Wounded trojan 0.4 tiles down-path from ghost — within aura radius (1.5).
    const ally = new TrojanEnemy({
      id: w.idGen('enemy'), defKind: 'trojan',
      baseStats: { hp: 100, speed: 0, armor: 0 },
      bounty: 0, flying: false, spawnerId: 'main',
    });
    ally.distAlongPath = 2.4; ally.x = 2.4; ally.y = 0;
    ally.maxHp = 100; ally.hp = 50;
    w.entities.enemies.push(ally);

    // 1.6 tiles down-path — just outside the 1.5 aura.
    const farAlly = new TrojanEnemy({
      id: w.idGen('enemy'), defKind: 'trojan',
      baseStats: { hp: 100, speed: 0, armor: 0 },
      bounty: 0, flying: false, spawnerId: 'main',
    });
    farAlly.distAlongPath = 3.6; farAlly.x = 3.6; farAlly.y = 0;
    farAlly.maxHp = 100; farAlly.hp = 50;
    w.entities.enemies.push(farAlly);

    const engine = new Engine(w, fakeClock);
    // 60 ticks ≈ 1 second; heal should add ~6 hp.
    for (let i = 0; i < 60; i++) engine.simStep(1 / 60);
    expect(ally.hp).toBeGreaterThan(55);      // healed
    expect(ally.hp).toBeLessThanOrEqual(100); // capped at maxHp
    expect(farAlly.hp).toBe(50);              // outside radius — no heal
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
