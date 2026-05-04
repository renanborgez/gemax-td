import type { EnemyDef } from '@/content/types';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import { TrojanEnemy } from '@/entities/enemies/TrojanEnemy';
import { DaemonEnemy } from '@/entities/enemies/DaemonEnemy';
import { RootkitEnemy } from '@/entities/enemies/RootkitEnemy';

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
  baseStats: { hp: 800, speed: 0.8, armor: 6 },
  bounty: 80, flying: false, classRef: RootkitEnemy,
};

export const ALL_ENEMY_DEFS: readonly EnemyDef[] = [WORM, TROJAN, DAEMON, ROOTKIT];
