import { Entity } from '@/entities/Entity';
import { type GridCoord } from '@/lib/types';

export type TargetPriority = 'first' | 'last' | 'strongest' | 'weakest' | 'closest';
export type TowerTargets = 'ground' | 'flying' | 'both';

export type TowerInit = {
  id: string;
  defKind: string;
  level: 1 | 2 | 3;
  x: number;
  y: number;
  tileCoord: GridCoord;
  baseStats: { damage: number; range: number; fireRate: number };
  projectileKind: string;
  targets: TowerTargets;
  defaultTargetPriority: TargetPriority;
};

export abstract class Tower extends Entity {
  defKind: string;
  level: 1 | 2 | 3;
  tileCoord: GridCoord;
  base: { damage: number; range: number; fireRate: number };
  projectileKind: string;
  targets: TowerTargets;
  targetPriority: TargetPriority;
  cooldown: number = 0;     // seconds remaining

  constructor(init: TowerInit) {
    super({ id: init.id, kind: `tower:${init.defKind}`, x: init.x, y: init.y });
    this.defKind = init.defKind;
    this.level = init.level;
    this.tileCoord = init.tileCoord;
    this.base = { ...init.baseStats };
    this.projectileKind = init.projectileKind;
    this.targets = init.targets;
    this.targetPriority = init.defaultTargetPriority;
  }
}
