import type { Enemy } from '@/entities/Enemy';
import { getEnemyStat } from '@/entities/getStat';
import { tickStatuses, totalDotDps } from '@/entities/StatusEffect';
import type { StatContext } from '@/entities/getStat';
import type { Path } from '@/world/Path';

export type LeakEvent = { enemyKind: string; enemyId: string };
export type DotTickEvent = {
  targetEnemyId: string;
  damage: number;
  attackerTowerId: string;
};

export function movementSystem(
  enemies: readonly Enemy[],
  path: Path,
  ctx: StatContext,
  dt: number,
  outLeaks: LeakEvent[],
  outDotTicks: DotTickEvent[],
): void {
  for (const e of enemies) {
    if (!e.alive) continue;

    // Status decay + DoT staging.
    const dotDps = totalDotDps(e.statuses);
    if (dotDps > 0) {
      // Attribute to the strongest dot's source (simplest: latest dot).
      const lastDot = [...e.statuses].reverse().find((s) => s.kind === 'dot');
      if (lastDot) {
        outDotTicks.push({
          targetEnemyId: e.id,
          damage: dotDps * dt,
          attackerTowerId: lastDot.appliedByTowerId,
        });
      }
    }
    tickStatuses(e.statuses, dt);

    const speed = getEnemyStat(
      { kind: 'enemy', defKind: e.defKind, base: e.base, statuses: e.statuses },
      'speed',
      ctx,
    );
    e.distAlongPath += speed * dt * path.tileSize;
    const xy = path.xyAtDistance(e.distAlongPath);
    e.x = xy.x;
    e.y = xy.y;

    if (path.reachedEnd(e.distAlongPath)) {
      e.alive = false;
      outLeaks.push({ enemyId: e.id, enemyKind: e.defKind });
    }
  }
}
