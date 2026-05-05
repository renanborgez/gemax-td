import type { ProjectileDef } from '@/content/types';
import { HitscanProjectile } from '@/entities/projectiles/HitscanProjectile';
import { BallisticProjectile } from '@/entities/projectiles/BallisticProjectile';
import { AoEPulseProjectile } from '@/entities/projectiles/AoEPulseProjectile';
import { TracerRoundProjectile } from '@/entities/projectiles/TracerRoundProjectile';
import { ChainArcProjectile, CHAIN_ARC_TTL } from '@/entities/projectiles/ChainArcProjectile';
import { PoisonDartProjectile } from '@/entities/projectiles/PoisonDartProjectile';
import { EMPBurstProjectile, EMP_BURST_TTL } from '@/entities/projectiles/EMPBurstProjectile';
import { MarkerDartProjectile, MARKER_DART_TTL } from '@/entities/projectiles/MarkerDartProjectile';
import { BeamArcProjectile, BEAM_ARC_TTL } from '@/entities/projectiles/BeamArcProjectile';
import { FlameConeProjectile, FLAME_CONE_TTL } from '@/entities/projectiles/FlameConeProjectile';
import { BulletProjectile, BULLET_TTL, BULLET_SPEED } from '@/entities/projectiles/BulletProjectile';

export const HITSCAN_BOLT: ProjectileDef = {
  kind: 'hitscan-bolt', ttl: 0.05, classRef: HitscanProjectile,
};

export const BALLISTIC_PULSE: ProjectileDef = {
  kind: 'ballistic-pulse', ttl: 2.0, speed: 6, classRef: BallisticProjectile,
};

export const AOE_PULSE: ProjectileDef = {
  kind: 'aoe-pulse', ttl: 0.4, classRef: AoEPulseProjectile,
};

export const TRACER_ROUND: ProjectileDef = {
  kind: 'tracer-round', ttl: 0.12, classRef: TracerRoundProjectile,
};

export const CHAIN_ARC: ProjectileDef = {
  kind: 'chain-arc', ttl: CHAIN_ARC_TTL, classRef: ChainArcProjectile,
};

export const POISON_DART: ProjectileDef = {
  kind: 'poison-dart', ttl: 2.0, speed: 7, classRef: PoisonDartProjectile,
};

export const EMP_BURST: ProjectileDef = {
  kind: 'emp-burst', ttl: EMP_BURST_TTL, classRef: EMPBurstProjectile,
};

export const MARKER_DART: ProjectileDef = {
  kind: 'marker-dart', ttl: MARKER_DART_TTL, speed: 8, classRef: MarkerDartProjectile,
};

export const BEAM_ARC: ProjectileDef = {
  kind: 'beam-arc', ttl: BEAM_ARC_TTL, classRef: BeamArcProjectile,
};

export const FLAME_CONE: ProjectileDef = {
  kind: 'flame-cone', ttl: FLAME_CONE_TTL, classRef: FlameConeProjectile,
};

export const BULLET: ProjectileDef = {
  kind: 'bullet', ttl: BULLET_TTL, speed: BULLET_SPEED, classRef: BulletProjectile,
};

export const ALL_PROJECTILE_DEFS: readonly ProjectileDef[] = [
  HITSCAN_BOLT, BALLISTIC_PULSE, AOE_PULSE, TRACER_ROUND, CHAIN_ARC, POISON_DART, EMP_BURST,
  MARKER_DART, BEAM_ARC, FLAME_CONE, BULLET,
];
