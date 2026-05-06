import type { World } from '@/world/World';
import { targetingSystem } from '@/engine/systems/targetingSystem';
import { movementSystem } from '@/engine/systems/movementSystem';
import { damageSystem, type DamageEvent } from '@/engine/systems/damageSystem';
import { compactInPlace, compactProjectilesAndRelease } from '@/engine/systems/cleanupSystem';
import { FIXED_DT, MAX_REAL_DT, MAX_STEPS_PER_FRAME } from '@/engine/time';
import { clamp } from '@/lib/lerp';
import { distance } from '@/lib/vec2';
import type { BallisticProjectile } from '@/entities/projectiles/BallisticProjectile';
import { type AoEPulseProjectile, LOGIC_BOMB_TTL_SAFETY } from '@/entities/projectiles/AoEPulseProjectile';
import type { HitscanProjectile } from '@/entities/projectiles/HitscanProjectile';
import type { TracerRoundProjectile } from '@/entities/projectiles/TracerRoundProjectile';
import type { ChainArcProjectile, ChainSegment } from '@/entities/projectiles/ChainArcProjectile';
import { CHAIN_ARC_TTL } from '@/entities/projectiles/ChainArcProjectile';
import type { PoisonDartProjectile } from '@/entities/projectiles/PoisonDartProjectile';
import { type EMPBurstProjectile, EMP_BURST_TTL, EMP_BURST_EXPAND_RATE } from '@/entities/projectiles/EMPBurstProjectile';
import { type MarkerDartProjectile, MARKER_DART_TTL } from '@/entities/projectiles/MarkerDartProjectile';
import { type BeamArcProjectile, BEAM_ARC_TTL } from '@/entities/projectiles/BeamArcProjectile';
import { type FlameConeProjectile, FLAME_CONE_TTL } from '@/entities/projectiles/FlameConeProjectile';
import { type BulletProjectile, BULLET_TTL } from '@/entities/projectiles/BulletProjectile';
import type { ICELanceTower } from '@/entities/towers/ICELanceTower';
import type { TeslaCoilTower } from '@/entities/towers/TeslaCoilTower';
import type { VenomSpireTower } from '@/entities/towers/VenomSpireTower';
import type { EMPTower } from '@/entities/towers/EMPTower';
import type { CryoFieldTower } from '@/entities/towers/CryoFieldTower';
import type { MarkerTower } from '@/entities/towers/MarkerTower';
import type { BeamCannonTower } from '@/entities/towers/BeamCannonTower';
import type { FlamerTower } from '@/entities/towers/FlamerTower';
import { isWraithPhasing } from '@/entities/wraithPhase';
import { tryGetEnemyDef } from '@/entities/registry';
import type { Enemy } from '@/entities/Enemy';

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

    // Build id→entity maps once per tick so per-projectile damage / chain
    // logic can resolve attackers and targets in O(1) instead of O(N) finds.
    // Rebuilt fresh each tick because `compactInPlace` may have moved entries
    // and bus listeners can't safely mutate these.
    const enemyById = new Map<string, typeof w.entities.enemies[number]>();
    for (const e of w.entities.enemies) if (e.alive) enemyById.set(e.id, e);
    const towerById = new Map<string, typeof w.entities.towers[number]>();
    for (const t of w.entities.towers) if (t.alive) towerById.set(t.id, t);

    // 1. Wave director: spawn enemies, emit wave events.
    const newSpawns: typeof w.entities.enemies = [];
    w.waveDirector.tick(w.time, dt, w.entities.enemies, newSpawns);
    for (const e of newSpawns) {
      // Apply difficulty mult on hp at spawn (so maxHp reflects displayable bar).
      e.maxHp = e.base.hp * w.difficulty.enemyHpMult;
      e.hp = e.maxHp;
      // Place at path start of the lane assigned by the spawner.
      e.distAlongPath = 0;
      const lane = w.paths[e.pathIndex] ?? w.paths[0]!;
      const xy = lane.xyAtDistance(0);
      e.x = xy.x; e.y = xy.y;
      w.entities.enemies.push(e);
    }

    // Refresh per-enemy specials before targeting reads them.
    for (const e of w.entities.enemies) {
      if (!e.alive) continue;
      e.untargetable = e.defKind === 'wraith' && isWraithPhasing(e.id, w.time);
    }

    // Cryo Field passive aura — refreshes a brief slow status on every enemy
    // in range each tick. No fire intent; runs before targeting so the slow
    // is already on enemies when other towers pick them.
    for (const t of w.entities.towers) {
      if (!t.alive || t.defKind !== 'cryo-field') continue;
      const cryo = t as CryoFieldTower;
      const r2 = t.base.range * t.base.range;
      for (const e of w.entities.enemies) {
        if (!e.alive || e.untargetable) continue;
        const dx = e.x - t.x;
        const dy = e.y - t.y;
        if (dx * dx + dy * dy > r2) continue;
        e.statuses.push({
          kind: 'slow',
          magnitude: cryo.auraSlowStrength,
          duration: cryo.auraSlowDuration,
          remaining: cryo.auraSlowDuration,
          appliedByTowerId: t.id,
        });
      }
    }

    // 2. Read phase: targeting → fireIntents.
    const ctx = { difficulty: w.difficulty, effects: { towerStatMults: w.effects.towerStatMults } };
    w.staged.fireIntents.length = 0;
    targetingSystem(w.entities.towers, w.entities.enemies, ctx, dt, w.staged.fireIntents);

    // 3. Convert fire intents into damage events / projectiles.
    w.staged.damage.length = 0;
    for (const intent of w.staged.fireIntents) {
      w.bus.emit('tower-fired', { towerId: intent.towerId, kind: intent.towerDefKind });
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
        // Bomb: spawn at the tower, fly to the captured target point, then expand.
        // radius / expandRate / flightSpeed come from class defaults (see AoEPulseProjectile),
        // but tower subclasses (LogicBomb / Mortar) can override `blastRadius`.
        const p = w.pools.aoe.acquire();
        p.alive = true;
        p.x = intent.fromX; p.y = intent.fromY;
        p.destX = intent.targetX; p.destY = intent.targetY;
        p.damage = intent.damage; p.sourceTowerId = intent.towerId;
        const sourceForRadius = towerById.get(intent.towerId) as { blastRadius?: number } | undefined;
        if (typeof sourceForRadius?.blastRadius === 'number') {
          p.radius = sourceForRadius.blastRadius;
        }
        const dx = intent.targetX - intent.fromX;
        const dy = intent.targetY - intent.fromY;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          p.phase = 'flight';
          p.vx = (dx / dist) * p.flightSpeed;
          p.vy = (dy / dist) * p.flightSpeed;
          p.flightDuration = dist / p.flightSpeed;
        } else {
          p.phase = 'detonate';
        }
        // ttl covers flight + full expansion + safety buffer.
        p.ttl = p.flightDuration + p.radius / p.expandRate + LOGIC_BOMB_TTL_SAFETY;
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
      } else if (intent.projectileKind === 'tracer-round') {
        // Sniper: instant hit, big single-target damage. Visual is a thicker
        // tracer that lingers slightly longer than the firewall hitscan beam.
        w.staged.damage.push({
          targetEnemyId: intent.targetEnemyId,
          damage: intent.damage,
          attackerTowerId: intent.towerId,
        });
        const p = w.pools.tracer.acquire();
        p.alive = true;
        p.fromX = intent.fromX; p.fromY = intent.fromY;
        p.x = intent.targetX; p.y = intent.targetY;
        p.targetEnemyId = intent.targetEnemyId;
        p.damage = 0; p.sourceTowerId = intent.towerId;
        p.ttl = 0.16;
        w.entities.projectiles.push(p);
      } else if (intent.projectileKind === 'chain-arc') {
        // Tesla Coil: damage primary target, then jump to N-1 further enemies
        // within chainJumpRadius of the previous link, applying compounding falloff.
        const sourceTower = towerById.get(intent.towerId) as TeslaCoilTower | undefined;
        const chainCount = sourceTower?.chainCount ?? 1;
        const falloff = sourceTower?.chainFalloff ?? 1;
        const jumpRadius = sourceTower?.chainJumpRadius ?? 0;
        const segments: ChainSegment[] = [];
        const hit = new Set<string>();
        hit.add(intent.targetEnemyId);
        let currentDamage = intent.damage;
        w.staged.damage.push({
          targetEnemyId: intent.targetEnemyId,
          damage: currentDamage,
          attackerTowerId: intent.towerId,
        });
        segments.push({
          fromX: intent.fromX, fromY: intent.fromY,
          toX: intent.targetX, toY: intent.targetY,
        });
        let cursorX = intent.targetX, cursorY = intent.targetY;
        for (let i = 1; i < chainCount; i++) {
          let bestId: string | null = null;
          let bestDist = Infinity;
          let bestX = 0, bestY = 0;
          for (const e of w.entities.enemies) {
            if (!e.alive || hit.has(e.id)) continue;
            if (e.untargetable) continue;
            if (e.flying && sourceTower?.targets === 'ground') continue;
            if (!e.flying && sourceTower?.targets === 'flying') continue;
            const d = Math.hypot(e.x - cursorX, e.y - cursorY);
            if (d > jumpRadius) continue;
            if (d < bestDist) { bestDist = d; bestId = e.id; bestX = e.x; bestY = e.y; }
          }
          if (!bestId) break;
          hit.add(bestId);
          currentDamage *= falloff;
          w.staged.damage.push({
            targetEnemyId: bestId,
            damage: currentDamage,
            attackerTowerId: intent.towerId,
          });
          segments.push({ fromX: cursorX, fromY: cursorY, toX: bestX, toY: bestY });
          cursorX = bestX; cursorY = bestY;
        }
        const p = w.pools.chainArc.acquire();
        p.alive = true;
        p.x = intent.targetX; p.y = intent.targetY;
        p.damage = 0; p.sourceTowerId = intent.towerId;
        p.ttl = CHAIN_ARC_TTL;
        p.segments.length = 0;
        for (const s of segments) p.segments.push(s);
        w.entities.projectiles.push(p);
      } else if (intent.projectileKind === 'poison-dart') {
        const p = w.pools.poisonDart.acquire();
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
      } else if (intent.projectileKind === 'emp-burst') {
        // EMP: instant radial pulse centered on the tower. Apply chip damage
        // and a stun status to every targetable enemy within stunRadius;
        // the projectile entity is purely visual (expanding ring).
        const sourceTower = towerById.get(intent.towerId) as EMPTower | undefined;
        const stunRadius = sourceTower?.stunRadius ?? 0;
        const stunDuration = (sourceTower?.stunDuration ?? 0) * w.effects.globals.stunDurationMult;
        for (const e of w.entities.enemies) {
          if (!e.alive || e.untargetable) continue;
          if (e.flying && sourceTower?.targets === 'ground') continue;
          if (!e.flying && sourceTower?.targets === 'flying') continue;
          const d = Math.hypot(e.x - intent.fromX, e.y - intent.fromY);
          if (d > stunRadius) continue;
          if (intent.damage > 0) {
            w.staged.damage.push({
              targetEnemyId: e.id,
              damage: intent.damage,
              attackerTowerId: intent.towerId,
            });
          }
          e.statuses.push({
            kind: 'stun',
            magnitude: 1,
            duration: stunDuration,
            remaining: stunDuration,
            appliedByTowerId: intent.towerId,
          });
        }
        const p = w.pools.empBurst.acquire();
        p.alive = true;
        p.x = intent.fromX; p.y = intent.fromY;
        p.damage = 0; p.sourceTowerId = intent.towerId;
        p.radius = stunRadius;
        p.currentRadius = 0;
        p.expandRate = EMP_BURST_EXPAND_RATE;
        p.ttl = EMP_BURST_TTL;
        w.entities.projectiles.push(p);
      } else if (intent.projectileKind === 'bullet') {
        // Bullet: light kinetic round shared by Bullet Turret + Machine Gun.
        // Travels in a straight line toward the captured target; on hit
        // applies its damage and despawns.
        const p = w.pools.bullet.acquire();
        p.alive = true;
        p.x = intent.fromX; p.y = intent.fromY;
        const dx = intent.targetX - intent.fromX;
        const dy = intent.targetY - intent.fromY;
        const len = Math.hypot(dx, dy) || 1;
        p.vx = (dx / len) * p.speed; p.vy = (dy / len) * p.speed;
        p.targetEnemyId = intent.targetEnemyId;
        p.damage = intent.damage; p.sourceTowerId = intent.towerId;
        p.ttl = BULLET_TTL;
        w.entities.projectiles.push(p);
      } else if (intent.projectileKind === 'marker-dart') {
        // Marker: light dart, no damage. On impact (handled in update loop)
        // applies a `mark` status to the target.
        const p = w.pools.markerDart.acquire();
        p.alive = true;
        p.x = intent.fromX; p.y = intent.fromY;
        const dx = intent.targetX - intent.fromX;
        const dy = intent.targetY - intent.fromY;
        const len = Math.hypot(dx, dy) || 1;
        p.vx = (dx / len) * p.speed; p.vy = (dy / len) * p.speed;
        p.targetEnemyId = intent.targetEnemyId;
        p.damage = 0; p.sourceTowerId = intent.towerId;
        p.ttl = MARKER_DART_TTL;
        w.entities.projectiles.push(p);
      } else if (intent.projectileKind === 'beam-arc') {
        // Beam Cannon: instant hitscan with per-tower ramp. Maintain ramp on
        // the source tower (resets when target id changes); apply current ramp
        // to the staged damage so chain-on-kill / mark / armor still apply.
        const beamTower = towerById.get(intent.towerId) as BeamCannonTower | undefined;
        let rampMult = 1;
        if (beamTower) {
          if (beamTower.lastTargetId !== intent.targetEnemyId) {
            beamTower.currentRamp = 1;
            beamTower.lastTargetId = intent.targetEnemyId;
          } else {
            // Each tick advances the ramp toward maxRamp at a rate that hits
            // maxRamp after rampSeconds of sustained fire. Approximated by
            // increasing per-fire (since the cooldown is the wall-clock pacing).
            const step = (beamTower.maxRamp - 1) / Math.max(0.1, beamTower.rampSeconds * beamTower.base.fireRate);
            beamTower.currentRamp = Math.min(beamTower.maxRamp, beamTower.currentRamp + step);
          }
          rampMult = beamTower.currentRamp;
        }
        w.staged.damage.push({
          targetEnemyId: intent.targetEnemyId,
          damage: intent.damage * rampMult,
          attackerTowerId: intent.towerId,
        });
        const p = w.pools.beamArc.acquire();
        p.alive = true;
        p.fromX = intent.fromX; p.fromY = intent.fromY;
        p.x = intent.targetX; p.y = intent.targetY;
        p.damage = 0; p.sourceTowerId = intent.towerId;
        p.rampFactor = rampMult;
        p.ttl = BEAM_ARC_TTL;
        w.entities.projectiles.push(p);
      } else if (intent.projectileKind === 'flame-cone') {
        // Flamer: cone splash. Primary target gets full damage; up to
        // (maxConeTargets - 1) additional enemies inside the cone half-angle
        // around the tower→target vector, capped by tower range.
        const flamerTower = towerById.get(intent.towerId) as FlamerTower | undefined;
        const maxTargets = flamerTower?.maxConeTargets ?? 1;
        const halfAngle = flamerTower?.coneHalfAngle ?? 0.6;
        const range = flamerTower?.base.range ?? 2.2;
        const dirX = intent.targetX - intent.fromX;
        const dirY = intent.targetY - intent.fromY;
        const dirLen = Math.hypot(dirX, dirY) || 1;
        const dirNX = dirX / dirLen;
        const dirNY = dirY / dirLen;
        const cosThreshold = Math.cos(halfAngle);
        const hits: string[] = [intent.targetEnemyId];
        // Collect candidates (excluding primary) within range and inside cone.
        for (const e of w.entities.enemies) {
          if (!e.alive || e.untargetable || e.id === intent.targetEnemyId) continue;
          if (e.flying && flamerTower?.targets === 'ground') continue;
          if (!e.flying && flamerTower?.targets === 'flying') continue;
          const ex = e.x - intent.fromX;
          const ey = e.y - intent.fromY;
          const len = Math.hypot(ex, ey);
          if (len > range || len < 0.01) continue;
          const cosAngle = (ex * dirNX + ey * dirNY) / len;
          if (cosAngle < cosThreshold) continue;
          hits.push(e.id);
          if (hits.length >= maxTargets) break;
        }
        for (const id of hits) {
          w.staged.damage.push({
            targetEnemyId: id,
            damage: intent.damage,
            attackerTowerId: intent.towerId,
          });
        }
        const p = w.pools.flameCone.acquire();
        p.alive = true;
        p.fromX = intent.fromX; p.fromY = intent.fromY;
        p.x = intent.targetX; p.y = intent.targetY;
        p.damage = 0; p.sourceTowerId = intent.towerId;
        p.coneHalfAngle = halfAngle;
        p.ttl = FLAME_CONE_TTL;
        w.entities.projectiles.push(p);
      }
    }

    // 4. Movement (read phase) — also stages DoT damage and leaks.
    const dotEvents: DamageEvent[] = [];
    movementSystem(w.entities.enemies, w.paths, ctx, dt, w.staged.leaks, dotEvents);

    // 5. Projectile updates (fold into damage stage).
    for (const p of w.entities.projectiles) {
      if (!p.alive) continue;
      p.ttl -= dt;
      if (p.ttl <= 0) { p.alive = false; continue; }
      if (p.kind === 'projectile:ballistic-pulse') {
        const bp = p as BallisticProjectile;
        bp.x += bp.vx * dt; bp.y += bp.vy * dt;
        const candidate = bp.targetEnemyId ? enemyById.get(bp.targetEnemyId) : undefined;
        const target = candidate && candidate.alive ? candidate : undefined;
        if (target) {
          const d = distance(bp, target);
          if (d < 0.4) {
            // Apply ICE Lance freeze + crit if eligible (source tower defKind == 'ice-lance').
            const sourceTower = towerById.get(bp.sourceTowerId);
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
      } else if (p.kind === 'projectile:poison-dart') {
        const pd = p as PoisonDartProjectile;
        pd.x += pd.vx * dt; pd.y += pd.vy * dt;
        const candidate = pd.targetEnemyId ? enemyById.get(pd.targetEnemyId) : undefined;
        const target = candidate && candidate.alive ? candidate : undefined;
        if (target) {
          const d = distance(pd, target);
          if (d < 0.4) {
            w.staged.damage.push({
              targetEnemyId: target.id,
              damage: pd.damage,
              attackerTowerId: pd.sourceTowerId,
            });
            const sourceTower = towerById.get(pd.sourceTowerId) as VenomSpireTower | undefined;
            if (sourceTower) {
              target.statuses.push({
                kind: 'dot',
                magnitude: sourceTower.dotDps,
                duration: sourceTower.dotDuration,
                remaining: sourceTower.dotDuration,
                appliedByTowerId: sourceTower.id,
              });
            }
            pd.alive = false;
          }
        } else {
          pd.alive = false;
        }
      } else if (p.kind === 'projectile:aoe-pulse') {
        const ap = p as AoEPulseProjectile;
        if (ap.phase === 'flight') {
          // Travel toward the captured destination; no damage during flight.
          ap.x += ap.vx * dt;
          ap.y += ap.vy * dt;
          ap.flightT += dt;
          if (ap.flightT >= ap.flightDuration) {
            ap.x = ap.destX; ap.y = ap.destY;
            ap.phase = 'detonate';
          }
        } else {
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
      } else if (p.kind === 'projectile:emp-burst') {
        // Visual-only: expand the ring up to the tower's stunRadius. Damage
        // and stun were applied at fire-time in the intent-handling block.
        const ep = p as EMPBurstProjectile;
        ep.currentRadius = Math.min(ep.radius, ep.currentRadius + ep.expandRate * dt);
      } else if (p.kind === 'projectile:bullet') {
        const bp = p as BulletProjectile;
        bp.x += bp.vx * dt; bp.y += bp.vy * dt;
        const candidate = bp.targetEnemyId ? enemyById.get(bp.targetEnemyId) : undefined;
        const target = candidate && candidate.alive ? candidate : undefined;
        if (target) {
          const d = distance(bp, target);
          if (d < 0.4) {
            w.staged.damage.push({
              targetEnemyId: target.id,
              damage: bp.damage,
              attackerTowerId: bp.sourceTowerId,
            });
            bp.alive = false;
          }
        } else {
          bp.alive = false;
        }
      } else if (p.kind === 'projectile:marker-dart') {
        // Marker dart: homes toward the captured target id; on impact pushes a
        // `mark` status onto the target. No damage staged.
        const md = p as MarkerDartProjectile;
        md.x += md.vx * dt; md.y += md.vy * dt;
        const candidate = md.targetEnemyId ? enemyById.get(md.targetEnemyId) : undefined;
        const target = candidate && candidate.alive ? candidate : undefined;
        if (target) {
          const d = distance(md, target);
          if (d < 0.4) {
            const sourceTower = towerById.get(md.sourceTowerId) as MarkerTower | undefined;
            if (sourceTower) {
              target.statuses.push({
                kind: 'mark',
                magnitude: sourceTower.markDamageMult,
                duration: sourceTower.markDuration,
                remaining: sourceTower.markDuration,
                appliedByTowerId: sourceTower.id,
              });
            }
            md.alive = false;
          }
        } else {
          md.alive = false;
        }
      }
      // beam-arc and flame-cone are visual-only — no per-tick update needed
      // beyond the ttl decrement at the top of the loop.
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
        const tower = towerById.get(ev.attackerTowerId);
        if (!tower || tower.defKind !== 'firewall') continue;
        const dead = enemyById.get(ev.targetEnemyId);
        if (!dead || dead.alive || dead.hp > 0) continue;
        let cursor = { x: dead.x, y: dead.y };
        const lastTowerId = tower.id;
        for (let i = 1; i < totalChain; i++) {
          let bestId: string | null = null;
          let bestDist = Infinity;
          for (const e of w.entities.enemies) {
            if (!e.alive || alreadyHit.has(e.id) || e.id === ev.targetEnemyId) continue;
            if (e.untargetable) continue;
            const d = Math.hypot(e.x - tower.x, e.y - tower.y);
            if (d > tower.base.range) continue;
            const dToCursor = Math.hypot(e.x - cursor.x, e.y - cursor.y);
            if (dToCursor < bestDist) { bestDist = dToCursor; bestId = e.id; }
          }
          if (!bestId) break;
          alreadyHit.add(bestId);
          chainEvents.push({ targetEnemyId: bestId, damage: ev.damage, attackerTowerId: lastTowerId });
          const next = enemyById.get(bestId);
          if (next) cursor = { x: next.x, y: next.y };
        }
      }
      if (chainEvents.length > 0) {
        damageSystem(w.entities.enemies, chainEvents, w.bus);
      }
    }

    // 6c. Boss specials: death-spawn + passive heal-aura.
    // Death-spawn fires once per dying enemy via `deathSpecialApplied`. Heal-
    // aura runs every tick and only on alive enemies, so the bounty/leak
    // accounting that follows is unaffected.
    const newSpawnsFromDeath: Enemy[] = [];
    for (const e of w.entities.enemies) {
      if (e.alive || e.deathSpecialApplied) continue;
      e.deathSpecialApplied = true;
      const def = tryGetEnemyDef(e.defKind);
      const sp = def?.special;
      if (sp?.type === 'deathSpawn') {
        for (let i = 0; i < sp.count; i++) {
          const child = w.spawner.spawn({
            enemyKind: sp.enemyKind,
            spawnerId: e.spawnerId,
            pathIndex: e.pathIndex,
          });
          child.maxHp = child.base.hp * w.difficulty.enemyHpMult;
          child.hp = child.maxHp;
          child.distAlongPath = e.distAlongPath;
          child.x = e.x;
          child.y = e.y;
          newSpawnsFromDeath.push(child);
        }
      }
    }
    for (const c of newSpawnsFromDeath) w.entities.enemies.push(c);

    // Heal-aura: each holder regenerates nearby enemies at hpPerSec, scaled by dt.
    for (const healer of w.entities.enemies) {
      if (!healer.alive) continue;
      const def = tryGetEnemyDef(healer.defKind);
      if (def?.special?.type !== 'healAura') continue;
      const aura = def.special;
      const heal = aura.hpPerSec * dt;
      const r2 = aura.radius * aura.radius;
      for (const target of w.entities.enemies) {
        if (!target.alive || target === healer) continue;
        const dx = target.x - healer.x;
        const dy = target.y - healer.y;
        if (dx * dx + dy * dy > r2) continue;
        if (target.hp >= target.maxHp) continue;
        target.hp = Math.min(target.maxHp, target.hp + heal);
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
    const bountyMult = w.effects.globals.bountyMult;
    for (const e of w.entities.enemies) {
      if (!e.alive && e.hp <= 0 && e.lastDamagedBy) {
        if (e.bounty > 0) {
          w.credits += Math.round(e.bounty * bountyMult);
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
      else if (p.kind === 'projectile:tracer-round') w.pools.tracer.release(p as TracerRoundProjectile);
      else if (p.kind === 'projectile:chain-arc') w.pools.chainArc.release(p as ChainArcProjectile);
      else if (p.kind === 'projectile:poison-dart') w.pools.poisonDart.release(p as PoisonDartProjectile);
      else if (p.kind === 'projectile:emp-burst') w.pools.empBurst.release(p as EMPBurstProjectile);
      else if (p.kind === 'projectile:marker-dart') w.pools.markerDart.release(p as MarkerDartProjectile);
      else if (p.kind === 'projectile:beam-arc') w.pools.beamArc.release(p as BeamArcProjectile);
      else if (p.kind === 'projectile:flame-cone') w.pools.flameCone.release(p as FlameConeProjectile);
      else if (p.kind === 'projectile:bullet') w.pools.bullet.release(p as BulletProjectile);
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
