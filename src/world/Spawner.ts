import type { EnemyKind } from '@/content/types';
import type { Enemy, EnemyInit } from '@/entities/Enemy';
import { getEnemyDef } from '@/entities/registry';
import type { IdGen } from '@/lib/id';

// `DeepReadonly` flattens the def's class-constructor signature to `{}`, so
// we recover a callable constructor type at the use site.
type EnemyCtor = new (init: EnemyInit) => Enemy;

export class Spawner {
  constructor(private idGen: IdGen) {}

  spawn(opts: { enemyKind: EnemyKind; spawnerId: string }): Enemy {
    const def = getEnemyDef(opts.enemyKind);
    const id = this.idGen('enemy');
    const Ctor = def.classRef as unknown as EnemyCtor;
    return new Ctor({
      id,
      defKind: def.kind,
      baseStats: { hp: def.baseStats.hp, speed: def.baseStats.speed, armor: def.baseStats.armor },
      bounty: def.bounty,
      flying: def.flying,
      spawnerId: opts.spawnerId,
    });
  }
}
