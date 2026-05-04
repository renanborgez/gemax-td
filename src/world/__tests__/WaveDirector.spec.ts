import { describe, it, expect, beforeEach } from 'vitest';
import { WaveDirector } from '@/world/WaveDirector';
import { Spawner } from '@/world/Spawner';
import { EventBus, type SimEventMap } from '@/engine/EventBus';
import { makeIdGen } from '@/lib/id';
import { registerEnemies, _resetRegistry } from '@/entities/registry';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import { TrojanEnemy } from '@/entities/enemies/TrojanEnemy';
import type { LevelDef } from '@/content/types';

const wormDef = {
  kind: 'worm' as const, displayName: 'Worm',
  baseStats: { hp: 18, speed: 2.6, armor: 0 }, bounty: 4, flying: false,
  classRef: WormEnemy,
};
const trojanDef = {
  kind: 'trojan' as const, displayName: 'Trojan',
  baseStats: { hp: 50, speed: 1.6, armor: 1 }, bounty: 9, flying: false,
  classRef: TrojanEnemy,
};

const level: LevelDef = {
  id: 'lvl-test', name: 'Test', chapter: 0,
  grid: { cols: 3, rows: 3, cells: [['path','path','path'],['path','path','path'],['path','path','path']] },
  spawners: [{ id: 'main', tile: { col: 0, row: 0 } }],
  path: [{ col: 0, row: 0 }, { col: 2, row: 0 }],
  startCredits: 100, startLives: 10,
  waves: [
    { delayBeforeStart: 0, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'worm', count: 3, spacing: 0.5, delay: 0 },
      { id: 'g2', spawnerId: 'main', enemyKind: 'trojan', count: 2, spacing: 1, delay: 0, afterGroupId: 'g1' },
    ]},
  ],
  starThresholds: { stars3: 10, stars2: 8, stars1: 1 },
};

beforeEach(() => { _resetRegistry(); registerEnemies([wormDef, trojanDef]); });

describe('WaveDirector', () => {
  it('spawns according to spacing and respects afterGroupId', () => {
    const bus = new EventBus<SimEventMap>();
    const dir = new WaveDirector(level, new Spawner(makeIdGen()), bus);

    dir.startWave(0, 0);
    expect(dir.waveStatus).toBe('running');

    let spawned: any[] = [];
    dir.tick(0, 0, [], spawned);
    expect(spawned.map(e => e.defKind)).toEqual(['worm']);  // delay=0, first spawn

    spawned = [];
    dir.tick(0.5, 0.5, [], spawned);
    expect(spawned.map(e => e.defKind)).toEqual(['worm']);

    spawned = [];
    dir.tick(1.0, 0.5, [], spawned);
    expect(spawned.map(e => e.defKind)).toEqual(['worm']);

    // g1 finished — g2 may now begin
    spawned = [];
    dir.tick(1.0, 0.0, [], spawned);
    expect(spawned.map(e => e.defKind)).toEqual(['trojan']);
  });

  it('emits wave-cleared when all groups spawned and board empty', () => {
    const bus = new EventBus<SimEventMap>();
    const dir = new WaveDirector(level, new Spawner(makeIdGen()), bus);
    let cleared = 0;
    bus.on('wave-cleared', () => cleared++);

    dir.startWave(0, 0);
    const allSpawned: any[] = [];
    for (let t = 0; t < 10; t += 0.25) dir.tick(t, 0.25, [], allSpawned);
    // All enemies "killed" (board empty in this test).
    dir.tick(10, 0.25, [], []);
    bus.flush();
    expect(cleared).toBe(1);
    expect(dir.waveStatus).toBe('cleared');
  });
});
