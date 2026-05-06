import type { EnemyDef } from '@/content/types';
import { MoteEnemy } from '@/entities/enemies/MoteEnemy';
import { SpriteEnemy } from '@/entities/enemies/SpriteEnemy';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import { PacketEnemy } from '@/entities/enemies/PacketEnemy';
import { DroneEnemy } from '@/entities/enemies/DroneEnemy';
import { CrawlerEnemy } from '@/entities/enemies/CrawlerEnemy';
import { StalkerEnemy } from '@/entities/enemies/StalkerEnemy';
import { PhantomEnemy } from '@/entities/enemies/PhantomEnemy';
import { TrojanEnemy } from '@/entities/enemies/TrojanEnemy';
import { BastionEnemy } from '@/entities/enemies/BastionEnemy';
import { ForkbombEnemy } from '@/entities/enemies/ForkbombEnemy';
import { CacheEnemy } from '@/entities/enemies/CacheEnemy';
import { ReaperEnemy } from '@/entities/enemies/ReaperEnemy';
import { KnightEnemy } from '@/entities/enemies/KnightEnemy';
import { SentinelEnemy } from '@/entities/enemies/SentinelEnemy';
import { ConstructEnemy } from '@/entities/enemies/ConstructEnemy';
import { BulwarkEnemy } from '@/entities/enemies/BulwarkEnemy';
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

// ─── Non-boss creep roster ──────────────────────────────────────────────────
// Stats follow a per-role formula keyed off the canonical grunt/heavy/elite
// trio (worm 18 / trojan 50 / daemon 130). Specialists slot between those
// anchors so the wave-survivability inequality `(8+N)·L ≥ h·N` keeps holding
// when the level generator rotates them in: every non-boss HP stays ≤ 130 so
// daemon remains the toughest non-boss creep, which is what the survivability
// test asserts.

// Pure swarm filler — minimum HP. Used to pad waves with low-h cost while
// keeping `(8+N)·L ≥ h·N` comfortable on short maps.
export const MOTE: EnemyDef = {
  kind: 'mote', displayName: 'Mote',
  baseStats: { hp: 4, speed: 1.5, armor: 0 },
  bounty: 1, flying: false, classRef: MoteEnemy,
};

// Tiny flying runner. Sets up tower-target diversification (currently every
// tower targets 'both', so flying is a visual/identity differentiator until
// ground-only towers ship).
export const SPRITE: EnemyDef = {
  kind: 'sprite', displayName: 'Sprite',
  baseStats: { hp: 6, speed: 5.0, armor: 0 },
  bounty: 4, flying: true, classRef: SpriteEnemy,
};

export const WORM: EnemyDef = {
  kind: 'worm', displayName: 'Worm',
  baseStats: { hp: 18, speed: 2.6, armor: 0 },
  bounty: 4, flying: false, classRef: WormEnemy,
};

// Runner. Half the worm's HP, ~50% faster — punishes targeting that prefers
// `first` on a long path; rewards `closest` / fast-fire towers.
export const PACKET: EnemyDef = {
  kind: 'packet', displayName: 'Packet',
  baseStats: { hp: 9, speed: 4.0, armor: 0 },
  bounty: 3, flying: false, classRef: PacketEnemy,
};

// Mid-tier flyer. Light armor, modest speed.
export const DRONE: EnemyDef = {
  kind: 'drone', displayName: 'Drone',
  baseStats: { hp: 45, speed: 2.5, armor: 1 },
  bounty: 11, flying: true, classRef: DroneEnemy,
};

// Mid-tier armored skirmisher. Slower than trojan, harder shell.
export const CRAWLER: EnemyDef = {
  kind: 'crawler', displayName: 'Crawler',
  baseStats: { hp: 50, speed: 2.0, armor: 4 },
  bounty: 12, flying: false, classRef: CrawlerEnemy,
};

// Fast mid-tier ground unit. Comparable HP to trojan but ~40% faster.
export const STALKER: EnemyDef = {
  kind: 'stalker', displayName: 'Stalker',
  baseStats: { hp: 60, speed: 2.2, armor: 0 },
  bounty: 13, flying: false, classRef: StalkerEnemy,
};

// Mid-tier ghost. Same role as future phasing enemies — for now a vanilla
// mid creep; phase mechanic ships when targeting can read a per-def phase
// spec instead of hardcoding `defKind === 'wraith'`.
export const PHANTOM: EnemyDef = {
  kind: 'phantom', displayName: 'Phantom',
  baseStats: { hp: 55, speed: 1.8, armor: 2 },
  bounty: 13, flying: false, classRef: PhantomEnemy,
};

export const TROJAN: EnemyDef = {
  kind: 'trojan', displayName: 'Trojan',
  baseStats: { hp: 50, speed: 1.6, armor: 1 },
  bounty: 9, flying: false, classRef: TrojanEnemy,
};

// Armor specialist. Low HP, high armor — punishes machine-gun spam, rewards
// piercing burst (sniper / plasma / mortar).
export const BASTION: EnemyDef = {
  kind: 'bastion', displayName: 'Bastion',
  baseStats: { hp: 32, speed: 1.4, armor: 6 },
  bounty: 7, flying: false, classRef: BastionEnemy,
};

// Splitter. On death, forks into 2 worms at the same path offset — the player
// has to keep DPS sustained or the leak count snowballs.
export const FORKBOMB: EnemyDef = {
  kind: 'forkbomb', displayName: 'Forkbomb',
  baseStats: { hp: 55, speed: 1.8, armor: 0 },
  bounty: 11, flying: false, classRef: ForkbombEnemy,
  special: { type: 'deathSpawn', enemyKind: 'worm', count: 2 },
};

// Support / heal-aura. Small radius, gentle hpPerSec — non-boss aura that
// makes nearby grunts effectively tankier. Rewards focusing the cache first.
export const CACHE: EnemyDef = {
  kind: 'cache', displayName: 'Cache',
  baseStats: { hp: 75, speed: 1.0, armor: 2 },
  bounty: 14, flying: false, classRef: CacheEnemy,
  special: { type: 'healAura', radius: 1.2, hpPerSec: 2 },
};

// Fast heavy. Mid HP, light armor, faster than daemon — closes distance
// quickly on long maps; punishes slow-fire towers placed deep in path.
export const REAPER: EnemyDef = {
  kind: 'reaper', displayName: 'Reaper',
  baseStats: { hp: 90, speed: 1.6, armor: 2 },
  bounty: 17, flying: false, classRef: ReaperEnemy,
};

// Armored heavy. High armor + medium HP — resistant to bullet/MG spam,
// rewards plasma / sniper / mortar pierce.
export const KNIGHT: EnemyDef = {
  kind: 'knight', displayName: 'Knight',
  baseStats: { hp: 100, speed: 1.0, armor: 6 },
  bounty: 19, flying: false, classRef: KnightEnemy,
};

// Heavy flyer. Highest-HP airborne unit; same survivability invariant
// (HP ≤ daemon's). Visually identifies as a bigger drone.
export const SENTINEL: EnemyDef = {
  kind: 'sentinel', displayName: 'Sentinel',
  baseStats: { hp: 105, speed: 1.3, armor: 2 },
  bounty: 21, flying: true, classRef: SentinelEnemy,
};

// Heavy splitter. Deathspawns 2 trojans (heavier add than forkbomb's worms)
// — late-mission DPS-sustain check before the boss wave.
export const CONSTRUCT: EnemyDef = {
  kind: 'construct', displayName: 'Construct',
  baseStats: { hp: 110, speed: 0.9, armor: 3 },
  bounty: 22, flying: false, classRef: ConstructEnemy,
  special: { type: 'deathSpawn', enemyKind: 'trojan', count: 2 },
};

// Tank specialist. High HP + heavy armor, slow — kept just under daemon HP
// so daemon remains the toughest non-boss creep (survivability invariant).
export const BULWARK: EnemyDef = {
  kind: 'bulwark', displayName: 'Bulwark',
  baseStats: { hp: 120, speed: 0.7, armor: 8 },
  bounty: 22, flying: false, classRef: BulwarkEnemy,
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
  MOTE, SPRITE, WORM, PACKET, DRONE, CRAWLER, STALKER, PHANTOM,
  TROJAN, BASTION, FORKBOMB, CACHE,
  REAPER, KNIGHT, SENTINEL, CONSTRUCT, BULWARK, DAEMON,
  ROOTKIT, WRAITH, HYPERVISOR, KERNELGHOST,
  FIRMWARE_LEECH, DARKNET_TITAN, QUANTUM_SHADE, LOGIC_GATE, VOIDWALKER, APEX,
];
