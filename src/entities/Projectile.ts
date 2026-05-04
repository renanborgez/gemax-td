import { Entity } from '@/entities/Entity';

export type ProjectileInit = {
  id: string;
  kind: string;             // 'projectile:hitscan-bolt', etc.
  x: number;
  y: number;
  damage: number;
  sourceTowerId: string;
  ttl: number;              // seconds before despawn
};

export abstract class Projectile extends Entity {
  damage: number;
  sourceTowerId: string;
  ttl: number;

  constructor(init: ProjectileInit) {
    super({ id: init.id, kind: init.kind, x: init.x, y: init.y });
    this.damage = init.damage;
    this.sourceTowerId = init.sourceTowerId;
    this.ttl = init.ttl;
  }

  /** Reset state for pool reuse. */
  resetForPool(): void {
    this.alive = true;
    this.x = 0; this.y = 0;
    this.damage = 0;
    this.sourceTowerId = '';
    this.ttl = 0;
  }
}
