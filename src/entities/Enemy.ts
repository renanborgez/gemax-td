import { Entity } from '@/entities/Entity';
import { type StatusEffect } from '@/entities/StatusEffect';

export type EnemyInit = {
  id: string;
  defKind: string;
  baseStats: { hp: number; speed: number; armor: number };
  bounty: number;
  flying: boolean;
  spawnerId: string;
};

export abstract class Enemy extends Entity {
  defKind: string;
  hp: number;
  maxHp: number;
  base: { hp: number; speed: number; armor: number };
  bounty: number;
  flying: boolean;
  pathIndex: number = 0;
  distAlongPath: number = 0;
  statuses: StatusEffect[] = [];
  lastDamagedBy: string | null = null;
  spawnerId: string;
  /** Set per-tick by enemy specials (e.g. wraith phase). Read by targeting
   *  to skip the enemy without mutating its other state. */
  untargetable: boolean = false;
  /** Engine flips this true after applying the enemy's death special (e.g.
   *  hypervisor death-spawn) so a single death can't fire it twice. */
  deathSpecialApplied: boolean = false;

  constructor(init: EnemyInit) {
    super({ id: init.id, kind: `enemy:${init.defKind}`, x: 0, y: 0 });
    this.defKind = init.defKind;
    this.base = { ...init.baseStats };
    this.hp = init.baseStats.hp;
    this.maxHp = init.baseStats.hp;
    this.bounty = init.bounty;
    this.flying = init.flying;
    this.spawnerId = init.spawnerId;
  }
}
