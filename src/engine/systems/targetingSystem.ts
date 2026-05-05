import type { Tower } from '@/entities/Tower';
import type { Enemy } from '@/entities/Enemy';
import { distance } from '@/lib/vec2';
import { getTowerStat } from '@/entities/getStat';
import type { StatContext } from '@/entities/getStat';

export type FireIntent = {
  towerId: string;
  towerDefKind: string;
  projectileKind: string;
  damage: number;
  fromX: number;
  fromY: number;
  targetEnemyId: string;
  targetX: number;
  targetY: number;
};

export function pickTarget(
  tower: Tower,
  enemies: readonly Enemy[],
  ctx: StatContext,
): Enemy | null {
  const range = getTowerStat(
    { kind: 'tower', defKind: tower.defKind, base: tower.base },
    'range',
    ctx,
  );
  let best: Enemy | null = null;
  let bestKey = -Infinity;

  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.untargetable) continue;
    if (e.flying && tower.targets === 'ground') continue;
    if (!e.flying && tower.targets === 'flying') continue;
    const d = distance(tower, e);
    if (d > range) continue;

    let key: number = 0;
    switch (tower.targetPriority) {
      case 'first':     key = e.distAlongPath; break;       // furthest along path
      case 'last':      key = -e.distAlongPath; break;       // shortest along path
      case 'strongest': key = e.hp; break;
      case 'weakest':   key = -e.hp; break;
      case 'closest':   key = -d; break;
    }
    if (key > bestKey) { bestKey = key; best = e; }
  }
  return best;
}

export function targetingSystem(
  towers: readonly Tower[],
  enemies: readonly Enemy[],
  ctx: StatContext,
  dt: number,
  out: FireIntent[],
): void {
  for (const t of towers) {
    if (!t.alive) continue;
    // Aura towers (e.g. Cryo Field) don't fire intents — their effect is
    // applied directly by the engine before targeting runs.
    if (t.defKind === 'cryo-field') continue;
    if (t.cooldown > 0) { t.cooldown = Math.max(0, t.cooldown - dt); continue; }
    const target = pickTarget(t, enemies, ctx);
    if (!target) continue;

    const damage = getTowerStat(
      { kind: 'tower', defKind: t.defKind, base: t.base },
      'damage',
      ctx,
    );
    const fireRate = getTowerStat(
      { kind: 'tower', defKind: t.defKind, base: t.base },
      'fireRate',
      ctx,
    );
    out.push({
      towerId: t.id,
      towerDefKind: t.defKind,
      projectileKind: t.projectileKind,
      damage,
      fromX: t.x,
      fromY: t.y,
      targetEnemyId: target.id,
      targetX: target.x,
      targetY: target.y,
    });
    t.cooldown = 1 / fireRate;
  }
}
