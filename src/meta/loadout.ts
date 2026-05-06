import type { TowerKind } from '@/content/types';
import type { SaveDataLatest } from '@/meta/schema';
import { LOADOUT_SLOTS } from '@/meta/schema';
import { getTowerDef } from '@/entities/registry';

export type UnlockResult = { ok: true } | { ok: false; reason: string };

/** Returns whether the player can buy this tower right now. Reasons surface in the UI. */
export function canUnlockTower(kind: TowerKind, data: SaveDataLatest): UnlockResult {
  if (data.meta.unlockedTowers.includes(kind)) return { ok: false, reason: 'OWNED' };
  const def = getTowerDef(kind);
  const gateCh = def.unlockedByChapter;
  if (gateCh !== undefined && !data.meta.chapterUnlocks[gateCh]?.rewardClaimedAt) {
    return { ok: false, reason: `LOCKED · CH ${gateCh.toString().padStart(2, '0')}` };
  }
  const cost = def.unlockCost ?? 0;
  if (cost === 0) return { ok: true };
  if (data.meta.shards < cost) return { ok: false, reason: `${cost - data.meta.shards} ◆ SHORT` };
  return { ok: true };
}

/**
 * Mutate draft: deduct shards and append to unlockedTowers. Caller checks canUnlockTower first.
 * Replaces the array reference (rather than push-mutating) so React consumers using
 * `meta.unlockedTowers` as a hook dependency see the change.
 */
export function unlockTower(kind: TowerKind, draft: SaveDataLatest): void {
  if (draft.meta.unlockedTowers.includes(kind)) return;
  const cost = getTowerDef(kind).unlockCost ?? 0;
  draft.meta.shards = Math.max(0, draft.meta.shards - cost);
  draft.meta.unlockedTowers = [...draft.meta.unlockedTowers, kind];
}

export function isInLoadout(kind: TowerKind, data: SaveDataLatest): boolean {
  return data.meta.activeLoadout.includes(kind);
}

export function loadoutFull(data: SaveDataLatest): boolean {
  // Slot-based loadout: full iff every slot is occupied (no nulls).
  return data.meta.activeLoadout.every((s) => s !== null) &&
    data.meta.activeLoadout.length >= LOADOUT_SLOTS;
}

/** Pad/trim a loadout to exactly LOADOUT_SLOTS, preserving slot positions. */
export function normalizeLoadout(arr: readonly (TowerKind | null)[]): (TowerKind | null)[] {
  const next = arr.slice(0, LOADOUT_SLOTS) as (TowerKind | null)[];
  while (next.length < LOADOUT_SLOTS) next.push(null);
  return next;
}

/**
 * Toggle a tower's loadout membership.
 * - In loadout → null that slot in place (placeholder stays where it was).
 * - Not in loadout + free slot exists → fill the first null slot.
 * - Not owned, or no free slot → no-op (caller should gate UI).
 *
 * Always replaces the activeLoadout array reference so React consumers using
 * it as a hook dependency see the change (in-place mutation wouldn't trigger
 * useMemo / re-render).
 */
export function toggleLoadout(kind: TowerKind, draft: SaveDataLatest): void {
  if (!draft.meta.unlockedTowers.includes(kind)) return;
  const next = normalizeLoadout(draft.meta.activeLoadout);
  const slot = next.indexOf(kind);
  if (slot >= 0) {
    next[slot] = null;
    draft.meta.activeLoadout = next;
    return;
  }
  const empty = next.indexOf(null);
  if (empty < 0) return;
  next[empty] = kind;
  draft.meta.activeLoadout = next;
}
