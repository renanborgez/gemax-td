import { registerEnemies, registerProjectiles, registerTowers } from '@/entities/registry';
import { ALL_TOWER_DEFS } from '@/content/towerDefs';
import { ALL_ENEMY_DEFS } from '@/content/enemyDefs';
import { ALL_PROJECTILE_DEFS } from '@/content/projectileDefs';

let bootstrapped = false;

export function bootstrap(): void {
  if (bootstrapped) return;
  registerTowers(ALL_TOWER_DEFS);
  registerEnemies(ALL_ENEMY_DEFS);
  registerProjectiles(ALL_PROJECTILE_DEFS);
  bootstrapped = true;
}

export function _resetBootstrap(): void { bootstrapped = false; }
