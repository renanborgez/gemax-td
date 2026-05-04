import type { ProjectileDef } from '@/content/types';
import { HitscanProjectile } from '@/entities/projectiles/HitscanProjectile';
import { BallisticProjectile } from '@/entities/projectiles/BallisticProjectile';
import { AoEPulseProjectile } from '@/entities/projectiles/AoEPulseProjectile';

export const HITSCAN_BOLT: ProjectileDef = {
  kind: 'hitscan-bolt', ttl: 0.05, classRef: HitscanProjectile,
};

export const BALLISTIC_PULSE: ProjectileDef = {
  kind: 'ballistic-pulse', ttl: 2.0, speed: 6, classRef: BallisticProjectile,
};

export const AOE_PULSE: ProjectileDef = {
  kind: 'aoe-pulse', ttl: 0.4, classRef: AoEPulseProjectile,
};

export const ALL_PROJECTILE_DEFS: readonly ProjectileDef[] = [HITSCAN_BOLT, BALLISTIC_PULSE, AOE_PULSE];
