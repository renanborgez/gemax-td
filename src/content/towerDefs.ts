import type { TowerDef } from '@/content/types';
import { FirewallTower } from '@/entities/towers/FirewallTower';
import { LogicBombTower } from '@/entities/towers/LogicBombTower';
import { ICELanceTower } from '@/entities/towers/ICELanceTower';
import { SniperTower } from '@/entities/towers/SniperTower';
import { TeslaCoilTower } from '@/entities/towers/TeslaCoilTower';
import { VenomSpireTower } from '@/entities/towers/VenomSpireTower';
import { EMPTower } from '@/entities/towers/EMPTower';
import { PlasmaCannonTower } from '@/entities/towers/PlasmaCannonTower';
import { MortarTower } from '@/entities/towers/MortarTower';
import { CryoFieldTower } from '@/entities/towers/CryoFieldTower';
import { MarkerTower } from '@/entities/towers/MarkerTower';
import { BeamCannonTower } from '@/entities/towers/BeamCannonTower';
import { FlamerTower } from '@/entities/towers/FlamerTower';
import { BulletTurretTower } from '@/entities/towers/BulletTurretTower';
import { MachineGunTower } from '@/entities/towers/MachineGunTower';

// ─── Base / starter towers ──────────────────────────────────────────────────

export const BULLET_TURRET: TowerDef = {
  kind: 'bullet-turret',
  displayName: 'Bullet Turret',
  baseStats: { range: 3.0, fireRate: 1.4, damage: 5 },
  upgrades: [
    { range: 3.4, fireRate: 1.6, damage: 8 },
    { range: 3.8, fireRate: 1.9, damage: 12 },
  ],
  cost: 40,
  projectileKind: 'bullet',
  defaultTargetPriority: 'first',
  targets: 'both',
  classRef: BulletTurretTower,
  description: 'Cheap kinetic turret. Reliable single-target damage — your starting placement.',
  rarity: 'common',
};

export const MACHINE_GUN: TowerDef = {
  kind: 'machine-gun',
  displayName: 'Machine Gun',
  baseStats: { range: 3.5, fireRate: 4.0, damage: 4 },
  upgrades: [
    { range: 4.0, fireRate: 4.8, damage: 6 },
    { range: 4.5, fireRate: 5.6, damage: 9 },
  ],
  cost: 120,
  projectileKind: 'bullet',
  defaultTargetPriority: 'first',
  targets: 'both',
  classRef: MachineGunTower,
  description: 'High-cadence rapid-fire. Shreds swarms with continuous chip damage.',
  unlockCost: 30,
  unlockedByChapter: 1,
  rarity: 'uncommon',
};

export const FIREWALL: TowerDef = {
  kind: 'firewall',
  displayName: 'Laser',
  baseStats: { range: 3.5, fireRate: 1.2, damage: 8 },
  upgrades: [
    { range: 4.0, fireRate: 1.4, damage: 12 },
    { range: 4.5, fireRate: 1.7, damage: 18 },
  ],
  cost: 50,
  projectileKind: 'hitscan-bolt',
  defaultTargetPriority: 'first',
  targets: 'both',
  classRef: FirewallTower,
  description: 'Continuous hitscan beam. Reliable single-target chip damage.',
  unlockedByChapter: 0,
  rarity: 'common',
};

export const LOGIC_BOMB: TowerDef = {
  kind: 'logic-bomb',
  displayName: 'Logic Bomb',
  baseStats: { range: 2.5, fireRate: 0.5, damage: 6 },
  upgrades: [
    { range: 3.0, fireRate: 0.6, damage: 10 },
    { range: 3.4, fireRate: 0.8, damage: 16 },
  ],
  cost: 90,
  projectileKind: 'aoe-pulse',
  defaultTargetPriority: 'strongest',
  targets: 'both',
  classRef: LogicBombTower,
  description: 'Lobs an AoE pulse that detonates over a radius. Strong against clusters.',
  rarity: 'common',
};

export const ICE_LANCE: TowerDef = {
  kind: 'ice-lance',
  displayName: 'ICE Lance',
  baseStats: { range: 4.5, fireRate: 0.7, damage: 26 },
  upgrades: [
    { range: 5.0, fireRate: 0.85, damage: 38 },
    { range: 5.5, fireRate: 1.0, damage: 60 },
  ],
  cost: 140,
  projectileKind: 'ballistic-pulse',
  defaultTargetPriority: 'strongest',
  targets: 'both',
  classRef: ICELanceTower,
  description: 'Heavy ballistic shard that briefly freezes its target on hit.',
  unlockCost: 40,
  unlockedByChapter: 6,
  rarity: 'uncommon',
};

export const SNIPER: TowerDef = {
  kind: 'sniper',
  displayName: 'Sniper',
  baseStats: { range: 8.0, fireRate: 0.4, damage: 60 },
  upgrades: [
    { range: 9.0, fireRate: 0.5, damage: 95 },
    { range: 10.0, fireRate: 0.6, damage: 160 },
  ],
  cost: 200,
  projectileKind: 'tracer-round',
  defaultTargetPriority: 'strongest',
  targets: 'both',
  classRef: SniperTower,
  description: 'Long-range tracer round. Slow fire, devastating single-target damage.',
  unlockCost: 60,
  unlockedByChapter: 2,
  rarity: 'rare',
};

export const TESLA_COIL: TowerDef = {
  kind: 'tesla-coil',
  displayName: 'Tesla Coil',
  baseStats: { range: 3.5, fireRate: 1.0, damage: 14 },
  upgrades: [
    { range: 4.0, fireRate: 1.2, damage: 22 },
    { range: 4.5, fireRate: 1.4, damage: 34 },
  ],
  cost: 175,
  projectileKind: 'chain-arc',
  defaultTargetPriority: 'closest',
  targets: 'both',
  classRef: TeslaCoilTower,
  description: 'Chains lightning between nearby enemies with damage falloff per jump.',
  unlockCost: 80,
  unlockedByChapter: 3,
  rarity: 'epic',
};

export const VENOM_SPIRE: TowerDef = {
  kind: 'venom-spire',
  displayName: 'Venom Spire',
  baseStats: { range: 4.0, fireRate: 1.5, damage: 4 },
  upgrades: [
    { range: 4.5, fireRate: 1.8, damage: 6 },
    { range: 5.0, fireRate: 2.2, damage: 9 },
  ],
  cost: 110,
  projectileKind: 'poison-dart',
  defaultTargetPriority: 'first',
  targets: 'both',
  classRef: VenomSpireTower,
  description: 'Fires fast poison darts. Low impact damage, heavy DoT that stacks.',
  unlockCost: 50,
  unlockedByChapter: 5,
  rarity: 'uncommon',
};

export const EMP: TowerDef = {
  kind: 'emp',
  displayName: 'EMP',
  baseStats: { range: 3.0, fireRate: 0.4, damage: 1 },
  upgrades: [
    { range: 3.5, fireRate: 0.5, damage: 2 },
    { range: 4.0, fireRate: 0.6, damage: 3 },
  ],
  cost: 160,
  projectileKind: 'emp-burst',
  defaultTargetPriority: 'closest',
  targets: 'both',
  classRef: EMPTower,
  description: 'Radial pulse stuns every enemy in range. Trades DPS for crowd control.',
  unlockCost: 70,
  unlockedByChapter: 3,
  rarity: 'rare',
};

export const PLASMA_CANNON: TowerDef = {
  kind: 'plasma-cannon',
  displayName: 'Plasma Cannon',
  baseStats: { range: 6.0, fireRate: 0.6, damage: 90 },
  upgrades: [
    { range: 6.5, fireRate: 0.7, damage: 140 },
    { range: 7.0, fireRate: 0.8, damage: 220 },
  ],
  cost: 320,
  projectileKind: 'tracer-round',
  defaultTargetPriority: 'strongest',
  targets: 'both',
  classRef: PlasmaCannonTower,
  description: 'Late-game heavy-hitter. Searing plasma bolts melt armored bosses.',
  unlockCost: 120,
  unlockedByChapter: 8,
  rarity: 'legendary',
};

export const MORTAR: TowerDef = {
  kind: 'mortar',
  displayName: 'Mortar',
  baseStats: { range: 7.0, fireRate: 0.3, damage: 28 },
  upgrades: [
    { range: 7.8, fireRate: 0.4, damage: 44 },
    { range: 8.5, fireRate: 0.5, damage: 70 },
  ],
  cost: 260,
  projectileKind: 'aoe-pulse',
  defaultTargetPriority: 'strongest',
  targets: 'both',
  classRef: MortarTower,
  description: 'Long-range siege bomb. Bigger blast than the Logic Bomb at the cost of cadence.',
  unlockCost: 100,
  unlockedByChapter: 4,
  rarity: 'epic',
};

// ─── Utility / synergy tier (added with the 13-tower roster) ─────────────────

export const CRYO_FIELD: TowerDef = {
  kind: 'cryo-field',
  displayName: 'Cryo Field',
  baseStats: { range: 2.5, fireRate: 1, damage: 0 },
  upgrades: [
    { range: 3.0, fireRate: 1, damage: 0 },
    { range: 3.5, fireRate: 1, damage: 0 },
  ],
  cost: 140,
  // Aura tower — `fireRate`/`damage` are nominal. Engine reads
  // `auraSlowStrength` + `range` directly each tick; no projectile is fired.
  // The placeholder projectileKind keeps shape compatibility for tests that
  // enumerate projectile pools.
  projectileKind: 'hitscan-bolt',
  defaultTargetPriority: 'closest',
  targets: 'both',
  classRef: CryoFieldTower,
  description: 'Passive aura. Continuously slows every enemy in range — pairs with DoT towers.',
  unlockCost: 50,
  unlockedByChapter: 6,
  rarity: 'uncommon',
};

export const MARKER: TowerDef = {
  kind: 'marker',
  displayName: 'Marker',
  baseStats: { range: 5.0, fireRate: 0.6, damage: 0 },
  upgrades: [
    { range: 5.5, fireRate: 0.7, damage: 0 },
    { range: 6.0, fireRate: 0.8, damage: 0 },
  ],
  cost: 150,
  projectileKind: 'marker-dart',
  defaultTargetPriority: 'strongest',
  targets: 'both',
  classRef: MarkerTower,
  description: 'Tags a target. Marked enemies take +25% damage from every tower.',
  unlockCost: 60,
  unlockedByChapter: 1,
  rarity: 'rare',
};

export const BEAM_CANNON: TowerDef = {
  kind: 'beam-cannon',
  displayName: 'Beam Cannon',
  baseStats: { range: 5.5, fireRate: 4.0, damage: 6 },
  upgrades: [
    { range: 6.0, fireRate: 4.5, damage: 9 },
    { range: 6.5, fireRate: 5.0, damage: 14 },
  ],
  cost: 240,
  projectileKind: 'beam-arc',
  defaultTargetPriority: 'strongest',
  targets: 'both',
  classRef: BeamCannonTower,
  description: 'Sustained beam. Damage ramps up to 2.5× while focused on the same target.',
  unlockCost: 90,
  unlockedByChapter: 7,
  rarity: 'epic',
};

export const FLAMER: TowerDef = {
  kind: 'flamer',
  displayName: 'Flamer',
  baseStats: { range: 2.2, fireRate: 1.4, damage: 7 },
  upgrades: [
    { range: 2.6, fireRate: 1.6, damage: 11 },
    { range: 3.0, fireRate: 1.8, damage: 17 },
  ],
  cost: 130,
  projectileKind: 'flame-cone',
  defaultTargetPriority: 'closest',
  targets: 'both',
  classRef: FlamerTower,
  description: 'Short-range cone. Hits up to 4 enemies in a forward arc.',
  unlockCost: 55,
  unlockedByChapter: 5,
  rarity: 'rare',
};

export const ALL_TOWER_DEFS: readonly TowerDef[] = [
  BULLET_TURRET, MACHINE_GUN,
  FIREWALL, LOGIC_BOMB, ICE_LANCE, SNIPER, TESLA_COIL, VENOM_SPIRE, EMP,
  PLASMA_CANNON, MORTAR, CRYO_FIELD, MARKER, BEAM_CANNON, FLAMER,
];
