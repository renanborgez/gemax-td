import type { LevelDef, WaveDef, SpawnGroup } from '@/content/types';
import type { Spawner } from '@/world/Spawner';
import type { Enemy } from '@/entities/Enemy';
import type { EventBus, SimEventMap } from '@/engine/EventBus';

type GroupState = {
  group: SpawnGroup;
  spawnedCount: number;
  nextSpawnAt: number;     // sim seconds; relative to wave start
  finished: boolean;
  unlocked: boolean;       // true once gating (afterGroupId) is satisfied
};

export type WaveStatus = 'idle' | 'running' | 'cleared';

export class WaveDirector {
  private currentIndex = -1;
  private currentWave: WaveDef | null = null;
  private currentGroups: GroupState[] = [];
  private waveStartedAt = 0;
  private status: WaveStatus = 'idle';
  private timeSinceCleared = 0;

  constructor(
    private level: LevelDef,
    private spawner: Spawner,
    private bus: EventBus<SimEventMap>,
  ) {}

  get totalWaves(): number { return this.level.waves.length; }
  get waveIndex(): number { return this.currentIndex; }
  get waveStatus(): WaveStatus { return this.status; }
  get isAllClear(): boolean {
    return this.currentIndex >= this.level.waves.length - 1 && this.status === 'cleared';
  }

  /** Begin wave at index immediately (used after countdown). */
  startWave(index: number, simTime: number): void {
    if (index < 0 || index >= this.level.waves.length) return;
    this.currentIndex = index;
    this.currentWave = this.level.waves[index]!;
    this.waveStartedAt = simTime;
    this.status = 'running';
    this.currentGroups = this.currentWave.groups.map((g) => ({
      group: g,
      spawnedCount: 0,
      nextSpawnAt: g.delay,
      finished: false,
      unlocked: !g.afterGroupId,
    }));
    this.bus.emit('wave-started', { waveIndex: index });
  }

  /**
   * Advance the director by `dt`. Active enemies still on the board are
   * passed in so we can detect "wave cleared" (all spawned, board empty).
   * Newly spawned enemies are appended to `outSpawned`.
   */
  tick(simTime: number, dt: number, activeEnemies: readonly Enemy[], outSpawned: Enemy[]): void {
    if (this.status !== 'running' || !this.currentWave) {
      if (this.status === 'cleared') this.timeSinceCleared += dt;
      return;
    }

    const elapsed = simTime - this.waveStartedAt;

    // Snapshot which groups were already finished BEFORE this tick, so a
    // dependent group can't unlock and spawn in the same tick its predecessor finishes.
    const finishedAtTickStart = new Set<string>();
    for (const gs of this.currentGroups) {
      if (gs.finished) finishedAtTickStart.add(gs.group.id);
    }

    for (const gs of this.currentGroups) {
      if (gs.finished) continue;
      // afterGroupId: gate this group on the predecessor finishing (as of tick start).
      if (!gs.unlocked) {
        if (gs.group.afterGroupId && finishedAtTickStart.has(gs.group.afterGroupId)) {
          gs.unlocked = true;
          // Start this group's clock from now: first spawn after `delay` from unlock.
          gs.nextSpawnAt = elapsed + gs.group.delay;
        } else {
          continue;
        }
      }
      while (gs.spawnedCount < gs.group.count && elapsed >= gs.nextSpawnAt) {
        const enemy = this.spawner.spawn({ enemyKind: gs.group.enemyKind, spawnerId: gs.group.spawnerId });
        outSpawned.push(enemy);
        gs.spawnedCount++;
        gs.nextSpawnAt += gs.group.spacing;
      }
      if (gs.spawnedCount >= gs.group.count) gs.finished = true;
    }

    const allGroupsFinished = this.currentGroups.every((g) => g.finished);
    const boardEmpty = activeEnemies.every((e) => !e.alive);
    if (allGroupsFinished && boardEmpty) {
      this.status = 'cleared';
      this.timeSinceCleared = 0;
      this.bus.emit('wave-cleared', { waveIndex: this.currentIndex });
    }
  }

  /** Number of enemies remaining (unspawned + alive in current wave). */
  remainingThisWave(activeEnemies: readonly Enemy[]): number {
    if (!this.currentWave) return 0;
    let pending = 0;
    for (const gs of this.currentGroups) pending += (gs.group.count - gs.spawnedCount);
    let alive = 0;
    for (const e of activeEnemies) if (e.alive) alive++;
    return pending + alive;
  }
}
