import type { Enemy } from '@/entities/Enemy';
import type { EventBus, SimEventMap } from '@/engine/EventBus';

export type DamageEvent = {
  targetEnemyId: string;
  damage: number;
  attackerTowerId: string;
};

export function damageSystem(
  enemies: readonly Enemy[],
  events: readonly DamageEvent[],
  bus: EventBus<SimEventMap>,
): void {
  if (events.length === 0) return;
  // Build id→enemy map once.
  const byId = new Map<string, Enemy>();
  for (const e of enemies) byId.set(e.id, e);

  for (const ev of events) {
    const e = byId.get(ev.targetEnemyId);
    if (!e || !e.alive) continue;
    // Armor: flat reduction, minimum 1 damage.
    const dealt = Math.max(1, ev.damage - e.base.armor);
    e.hp -= dealt;
    e.lastDamagedBy = ev.attackerTowerId;
    if (e.hp <= 0) {
      e.alive = false;
      bus.emit('enemy-died', {
        enemyId: e.id,
        bounty: e.bounty,
        killedByTowerId: ev.attackerTowerId,
      });
    }
  }
}
