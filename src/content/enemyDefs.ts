import type { EnemyDef } from '@/content/types';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import { TrojanEnemy } from '@/entities/enemies/TrojanEnemy';
import { DaemonEnemy } from '@/entities/enemies/DaemonEnemy';
import { RootkitEnemy } from '@/entities/enemies/RootkitEnemy';
import { WraithEnemy } from '@/entities/enemies/WraithEnemy';
import { HypervisorEnemy } from '@/entities/enemies/HypervisorEnemy';
import { KernelghostEnemy } from '@/entities/enemies/KernelghostEnemy';
import { FirmwareLeechEnemy } from '@/entities/enemies/FirmwareLeechEnemy';
import { DarknetTitanEnemy } from '@/entities/enemies/DarknetTitanEnemy';
import { QuantumShadeEnemy } from '@/entities/enemies/QuantumShadeEnemy';
import { LogicGateEnemy } from '@/entities/enemies/LogicGateEnemy';
import { VoidwalkerEnemy } from '@/entities/enemies/VoidwalkerEnemy';
import { ApexEnemy } from '@/entities/enemies/ApexEnemy';
import { bossHp } from '@/content/bossCurve';

export const WORM: EnemyDef = {
  kind: 'worm', displayName: 'Worm',
  baseStats: { hp: 18, speed: 2.6, armor: 0 },
  bounty: 4, flying: false, classRef: WormEnemy,
};

export const TROJAN: EnemyDef = {
  kind: 'trojan', displayName: 'Trojan',
  baseStats: { hp: 50, speed: 1.6, armor: 1 },
  bounty: 9, flying: false, classRef: TrojanEnemy,
};

export const DAEMON: EnemyDef = {
  kind: 'daemon', displayName: 'Daemon',
  baseStats: { hp: 130, speed: 1.0, armor: 4 },
  bounty: 18, flying: false, classRef: DaemonEnemy,
};

export const ROOTKIT: EnemyDef = {
  kind: 'rootkit', displayName: 'Rootkit',
  baseStats: { hp: bossHp(0), speed: 0.8, armor: 6 },
  bounty: 80, flying: false, classRef: RootkitEnemy,
};

export const WRAITH: EnemyDef = {
  kind: 'wraith', displayName: 'Wraith',
  baseStats: { hp: bossHp(1), speed: 1.0, armor: 4 },
  bounty: 140, flying: false, classRef: WraithEnemy,
};

export const HYPERVISOR: EnemyDef = {
  kind: 'hypervisor', displayName: 'Hypervisor',
  baseStats: { hp: bossHp(2), speed: 0.7, armor: 10 },
  bounty: 240, flying: false, classRef: HypervisorEnemy,
  // On death the hypervisor forks two trojans at its current position —
  // the player must keep DPS on the wave for a few extra seconds.
  special: { type: 'deathSpawn', enemyKind: 'trojan', count: 2 },
};

export const KERNELGHOST: EnemyDef = {
  kind: 'kernelghost', displayName: 'Kernelghost',
  baseStats: { hp: bossHp(3), speed: 0.9, armor: 8 },
  bounty: 400, flying: false, classRef: KernelghostEnemy,
  // The kernelghost rebuilds every adjacent enemy each second; the player
  // needs to either cull the swarm first or commit overwhelming burst on the boss.
  special: { type: 'healAura', radius: 1.5, hpPerSec: 6 },
};

export const FIRMWARE_LEECH: EnemyDef = {
  kind: 'firmware-leech', displayName: 'Firmware Leech',
  baseStats: { hp: bossHp(4), speed: 0.85, armor: 12 },
  bounty: 640, flying: false, classRef: FirmwareLeechEnemy,
  // Drains lives on contact via heal-aura siphon framing — simpler heal-aura
  // for now, can specialize later.
  special: { type: 'healAura', radius: 1.8, hpPerSec: 10 },
};

export const DARKNET_TITAN: EnemyDef = {
  kind: 'darknet-titan', displayName: 'Darknet Titan',
  baseStats: { hp: bossHp(5), speed: 0.6, armor: 16 },
  bounty: 1024, flying: false, classRef: DarknetTitanEnemy,
  // Spawns three trojans on death — a tank that snowballs if not finished cleanly.
  special: { type: 'deathSpawn', enemyKind: 'trojan', count: 3 },
};

export const QUANTUM_SHADE: EnemyDef = {
  kind: 'quantum-shade', displayName: 'Quantum Shade',
  baseStats: { hp: bossHp(6), speed: 1.1, armor: 10 },
  bounty: 1638, flying: false, classRef: QuantumShadeEnemy,
};

export const LOGIC_GATE: EnemyDef = {
  kind: 'logic-gate', displayName: 'Logic Gate',
  baseStats: { hp: bossHp(7), speed: 0.7, armor: 20 },
  bounty: 2621, flying: false, classRef: LogicGateEnemy,
  // Death-spawns 4 daemons — late-game punishing finish.
  special: { type: 'deathSpawn', enemyKind: 'daemon', count: 4 },
};

export const VOIDWALKER: EnemyDef = {
  kind: 'voidwalker', displayName: 'Voidwalker',
  baseStats: { hp: bossHp(8), speed: 1.0, armor: 18 },
  bounty: 4194, flying: false, classRef: VoidwalkerEnemy,
  // Heals nearby enemies harder than kernelghost.
  special: { type: 'healAura', radius: 2.0, hpPerSec: 15 },
};

export const APEX: EnemyDef = {
  kind: 'apex', displayName: 'Apex',
  baseStats: { hp: bossHp(9), speed: 0.95, armor: 24 },
  bounty: 6711, flying: false, classRef: ApexEnemy,
  // Final boss combo: spawns 2 daemons on death.
  special: { type: 'deathSpawn', enemyKind: 'daemon', count: 2 },
};

export const ALL_ENEMY_DEFS: readonly EnemyDef[] = [
  WORM, TROJAN, DAEMON, ROOTKIT, WRAITH, HYPERVISOR, KERNELGHOST,
  FIRMWARE_LEECH, DARKNET_TITAN, QUANTUM_SHADE, LOGIC_GATE, VOIDWALKER, APEX,
];
