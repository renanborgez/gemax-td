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
