import type { World } from '@/world/World';
import { targetingSystem } from '@/engine/systems/targetingSystem';
import { movementSystem } from '@/engine/systems/movementSystem';
import { damageSystem, type DamageEvent } from '@/engine/systems/damageSystem';
import { compactInPlace, compactProjectilesAndRelease } from '@/engine/systems/cleanupSystem';
import { FIXED_DT, MAX_REAL_DT, MAX_STEPS_PER_FRAME } from '@/engine/time';
import { clamp } from '@/lib/lerp';
import { distance } from '@/lib/vec2';
import type { BallisticProjectile } from '@/entities/projectiles/BallisticProjectile';
import type { AoEPulseProjectile } from '@/entities/projectiles/AoEPulseProjectile';
import type { HitscanProjectile } from '@/entities/projectiles/HitscanProjectile';
import type { ICELanceTower } from '@/entities/towers/ICELanceTower';

export type Clock = {
  now(): number;                              // ms
  schedule(cb: () => void): () => void;       // returns canceller (RAF or setTimeout)
};

export type EngineHost = {
  /** Called when a match transitions to won/lost. */
  onMatchEnded?(world: World, won: boolean): void;
};

export class Engine {
  private accumulator = 0;
  private lastNow: number = 0;
  private cancelTick: (() => void) | null = null;
  private speedMultiplier = 1;

  constructor(
    private readonly world: World,
    private readonly clock: Clock,
    private readonly host: EngineHost = {},
  ) {}

  start(): void {
    this.world.status = 'playing';
    this.lastNow = this.clock.now();
    this.scheduleNext();
  }

  pause(): void {
    if (this.cancelTick) { this.cancelTick(); this.cancelTick = null; }
    this.world.status = 'paused';
  }

  resume(): void {
    if (this.world.status !== 'paused') return;
    this.world.status = 'playing';
    this.lastNow = this.clock.now();
    this.scheduleNext();
  }

  stop(): void {
    if (this.cancelTick) { this.cancelTick(); this.cancelTick = null; }
  }

  setSpeed(s: 1 | 2 | 3): void {
    this.speedMultiplier = s;
    this.world.selectedSpeed = s;
    this.accumulator = 0;
  }

  /** Send the user's "begin wave N" intent into the engine. */
  startNextWave(): void {
    const idx = this.world.waveDirector.waveIndex + 1;
    if (idx >= this.world.waveDirector.totalWaves) return;
    this.world.waveDirector.startWave(idx, this.world.time);
  }

  /** One real frame: drain accumulator into fixed simSteps. */
  frame(now: number): void {
    if (this.world.status !== 'playing') return;
    const realDt = clamp((now - this.lastNow) / 1000, 0, MAX_REAL_DT);
    this.lastNow = now;

    this.accumulator += realDt * this.speedMultiplier;
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      this.simStep(FIXED_DT);
      this.accumulator -= FIXED_DT;
      steps++;
      if (this.world.status !== 'playing') break;     // won/lost mid-frame
    }
    if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;

    this.world.redraw.bump();
    if (this.world.status === 'playing') this.scheduleNext();
  }

  /** Public for tests / determinism harness. Performs one fixed step. */
  simStep(dt: number): void {
    const w = this.world;
    w.time += dt;

    // 1. Wave director: spawn enemies, emit wave events.
    const newSpawns: typeof w.entities.enemies = [];
    w.waveDirector.tick(w.time, dt, w.entities.enemies, newSpawns);
    for (const e of newSpawns) {
      // Apply difficulty mult on hp at spawn (so maxHp reflects displayable bar).
      e.maxHp = e.base.hp * w.difficulty.enemyHpMult;
      e.hp = e.maxHp;
      // Place at path start.
      e.distAlongPath = 0;
      const xy = w.path.xyAtDistance(0);
      e.x = xy.x; e.y = xy.y;
      w.entities.enemies.push(e);
    }

    // 2. Read phase: targeting → fireIntents.
    const ctx = { difficulty: w.difficulty, effects: { towerStatMults: w.effects.towerStatMults } };
    w.staged.fireIntents.length = 0;
    targetingSystem(w.entities.towers, w.entities.enemies, ctx, dt, w.staged.fireIntents);

    // 3. Convert fire intents into damage events / projectiles.
    w.staged.damage.length = 0;
    for (const intent of w.staged.fireIntents) {
      // Hitscan: instant damage, no projectile entity persisted.
      if (intent.projectileKind === 'hitscan-bolt') {
        const damage = intent.damage;
        // ICE Lance crit + freeze are not on hitscan; chain on Firewall happens after damage application.
        w.staged.damage.push({
          targetEnemyId: intent.targetEnemyId,
          damage,
          attackerTowerId: intent.towerId,
        });
        // Visual-only beam entity: lives a few frames so the renderer can draw
        // a tower→target line. Damage is already staged above.
        const p = w.pools.hitscan.acquire();
        p.alive = true;
        p.fromX = intent.fromX; p.fromY = intent.fromY;
        p.x = intent.targetX; p.y = intent.targetY;
        p.targetEnemyId = intent.targetEnemyId;
        p.damage = 0; p.sourceTowerId = intent.towerId;
        p.ttl = 0.08;
        w.entities.projectiles.push(p);
      } else if (intent.projectileKind === 'aoe-pulse') {
        // Spawn an AoE pulse at target.
        const p = w.pools.aoe.acquire();
        p.alive = true;
        p.x = intent.targetX; p.y = intent.targetY;
        p.damage = intent.damage; p.sourceTowerId = intent.towerId;
        p.ttl = 0.4; p.radius = 1.5; p.currentRadius = 0;
        p.hitEnemyIds.clear();
        // Tech: longer slow field on logic bomb is read at hit time.
        w.entities.projectiles.push(p);
      } else if (intent.projectileKind === 'ballistic-pulse') {
        const p = w.pools.ballistic.acquire();
        p.alive = true;
        p.x = intent.fromX; p.y = intent.fromY;
        const dx = intent.targetX - intent.fromX;
        const dy = intent.targetY - intent.fromY;
        const len = Math.hypot(dx, dy) || 1;
        p.vx = (dx / len) * p.speed; p.vy = (dy / len) * p.speed;
        p.targetEnemyId = intent.targetEnemyId;
        p.damage = intent.damage; p.sourceTowerId = intent.towerId;
        p.ttl = 2;
        w.entities.projectiles.push(p);
      }
    }

    // 4. Movement (read phase) — also stages DoT damage and leaks.
    const dotEvents: DamageEvent[] = [];
    movementSystem(w.entities.enemies, w.path, ctx, dt, w.staged.leaks, dotEvents);

    // 5. Projectile updates (fold into damage stage).
    for (const p of w.entities.projectiles) {
      if (!p.alive) continue;
      p.ttl -= dt;
      if (p.ttl <= 0) { p.alive = false; continue; }
      if (p.kind === 'projectile:ballistic-pulse') {
        const bp = p as BallisticProjectile;
        bp.x += bp.vx * dt; bp.y += bp.vy * dt;
        const target = w.entities.enemies.find((e) => e.id === bp.targetEnemyId && e.alive);
        if (target) {
          const d = distance(bp, target);
          if (d < 0.4) {
            // Apply ICE Lance freeze + crit if eligible (source tower defKind == 'ice-lance').
            const sourceTower = w.entities.towers.find((t) => t.id === bp.sourceTowerId);
            let dmg = bp.damage;
            if (sourceTower?.defKind === 'ice-lance' && w.effects.behaviors.iceLanceCrit) {
              if (w.rng.chance(w.effects.behaviors.iceLanceCrit.chance)) dmg *= w.effects.behaviors.iceLanceCrit.mult;
            }
            w.staged.damage.push({ targetEnemyId: target.id, damage: dmg, attackerTowerId: bp.sourceTowerId });
            if (sourceTower?.defKind === 'ice-lance') {
              const ice = sourceTower as ICELanceTower;
              target.statuses.push({
                kind: 'freeze', magnitude: 1, duration: ice.freezeDuration, remaining: ice.freezeDuration, appliedByTowerId: ice.id,
              });
            }
            bp.alive = false;
          }
        } else {
          bp.alive = false;
        }
      } else if (p.kind === 'projectile:aoe-pulse') {
        const ap = p as AoEPulseProjectile;
        ap.currentRadius = Math.min(ap.radius, ap.currentRadius + ap.expandRate * dt);
        for (const e of w.entities.enemies) {
          if (!e.alive || ap.hitEnemyIds.has(e.id)) continue;
          const d = distance(ap, e);
          if (d <= ap.currentRadius) {
            ap.hitEnemyIds.add(e.id);
            w.staged.damage.push({ targetEnemyId: e.id, damage: ap.damage, attackerTowerId: ap.sourceTowerId });
            // Tech: slow field on logic-bomb.
            const sf = w.effects.behaviors.slowFieldOnLogicBomb;
            if (sf) {
              e.statuses.push({ kind: 'slow', magnitude: 0.5, duration: sf.duration, remaining: sf.duration, appliedByTowerId: ap.sourceTowerId });
              if (sf.dotPerSecond) {
                e.statuses.push({ kind: 'dot', magnitude: sf.dotPerSecond, duration: sf.duration, remaining: sf.duration, appliedByTowerId: ap.sourceTowerId });
              }
            }
          }
        }
      }
    }

    // 6. Write phase: apply staged damage events.
    for (const ev of dotEvents) w.staged.damage.push(ev);
    damageSystem(w.entities.enemies, w.staged.damage, w.bus);

    // 6b. Firewall chain-on-kill (tech effect).
    const chainCounts = w.effects.behaviors.chainKill;
    if (chainCounts && chainCounts['firewall']) {
      const totalChain = chainCounts['firewall']!;
      const chainEvents: DamageEvent[] = [];
      const alreadyHit = new Set<string>();
      for (const ev of w.staged.damage) {
        if (ev.damage <= 0) continue;
        const tower = w.entities.towers.find((t) => t.id === ev.attackerTowerId);
        if (!tower || tower.defKind !== 'firewall') continue;
        const dead = w.entities.enemies.find((e) => e.id === ev.targetEnemyId && !e.alive && e.hp <= 0);
        if (!dead) continue;
        let cursor = { x: dead.x, y: dead.y };
        const lastTowerId = tower.id;
        for (let i = 1; i < totalChain; i++) {
          let bestId: string | null = null;
          let bestDist = Infinity;
          for (const e of w.entities.enemies) {
            if (!e.alive || alreadyHit.has(e.id) || e.id === ev.targetEnemyId) continue;
            const d = Math.hypot(e.x - tower.x, e.y - tower.y);
            if (d > tower.base.range) continue;
            const dToCursor = Math.hypot(e.x - cursor.x, e.y - cursor.y);
            if (dToCursor < bestDist) { bestDist = dToCursor; bestId = e.id; }
          }
          if (!bestId) break;
          alreadyHit.add(bestId);
          chainEvents.push({ targetEnemyId: bestId, damage: ev.damage, attackerTowerId: lastTowerId });
          const next = w.entities.enemies.find((e) => e.id === bestId);
          if (next) cursor = { x: next.x, y: next.y };
        }
      }
      if (chainEvents.length > 0) {
        damageSystem(w.entities.enemies, chainEvents, w.bus);
      }
    }

    // 7. Process leaks (lives, lose check).
    let livesChanged = false;
    for (const leak of w.staged.leaks) {
      w.lives -= 1;
      w.bus.emit('life-lost', { enemyKind: leak.enemyKind });
      livesChanged = true;
    }
    w.staged.leaks.length = 0;
    if (livesChanged) w.bus.emit('lives-changed', { lives: w.lives });

    // 8. Bounty payouts on dead enemies.
    let creditsChanged = false;
    for (const e of w.entities.enemies) {
      if (!e.alive && e.hp <= 0 && e.lastDamagedBy) {
        if (e.bounty > 0) {
          w.credits += e.bounty;
          e.bounty = 0;
          creditsChanged = true;
        }
      }
    }
    if (creditsChanged) w.bus.emit('credits-changed', { credits: w.credits });

    // 9. Compact arrays (release pool entries).
    compactInPlace(w.entities.enemies);
    compactInPlace(w.entities.towers);
    compactProjectilesAndRelease(w.entities.projectiles, (p) => {
      if (p.kind === 'projectile:hitscan-bolt') w.pools.hitscan.release(p as HitscanProjectile);
      else if (p.kind === 'projectile:ballistic-pulse') w.pools.ballistic.release(p as BallisticProjectile);
      else if (p.kind === 'projectile:aoe-pulse') w.pools.aoe.release(p as AoEPulseProjectile);
    });

    // 10. Life regen tech node.
    if (w.effects.globals.lifeRegenPerMinute > 0) {
      w.regenAccumulator += dt;
      const period = 60 / w.effects.globals.lifeRegenPerMinute;
      let regenChanged = false;
      while (w.regenAccumulator >= period) {
        w.regenAccumulator -= period;
        if (w.lives < w.level.startLives) {
          w.lives += 1;
          regenChanged = true;
        }
      }
      if (regenChanged) w.bus.emit('lives-changed', { lives: w.lives });
    }

    // 11. Lose check.
    if (w.lives <= 0) {
      w.status = 'lost';
      w.bus.emit('match-lost', { wavesCleared: Math.max(0, w.waveDirector.waveIndex) });
      this.host.onMatchEnded?.(w, false);
      w.bus.flush();
      return;
    }

    // 12. Win check: all waves cleared.
    if (w.waveDirector.isAllClear) {
      w.status = 'won';
      w.bus.emit('match-won', { stars: 0, shardsAwarded: 0 }); // shells; PlayScreen recomputes
      this.host.onMatchEnded?.(w, true);
      w.bus.flush();
      return;
    }

    // 13. Flush bus to subscribers.
    w.bus.flush();
  }

  private scheduleNext(): void {
    this.cancelTick = this.clock.schedule(() => this.frame(this.clock.now()));
  }
}
