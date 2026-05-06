import type { EnemyKind } from '@/content/types';
import type { Enemy } from '@/entities/Enemy';
import { getEnemyDef } from '@/entities/registry';
import type { IdGen } from '@/lib/id';

export class Spawner {
  constructor(private idGen: IdGen) {}

  spawn(opts: { enemyKind: EnemyKind; spawnerId: string; pathIndex: number }): Enemy {
    const def = getEnemyDef(opts.enemyKind);
    const id = this.idGen('enemy');
    const enemy = new def.classRef({
      id,
      defKind: def.kind,
      baseStats: { hp: def.baseStats.hp, speed: def.baseStats.speed, armor: def.baseStats.armor },
      bounty: def.bounty,
      flying: def.flying,
      spawnerId: opts.spawnerId,
    });
    enemy.pathIndex = opts.pathIndex;
    return enemy;
  }
}
