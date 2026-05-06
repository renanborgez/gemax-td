import type { TowerKind } from '@/content/types';
import type { SaveDataLatest } from '@/meta/schema';
import { LOADOUT_SLOTS } from '@/meta/schema';
import { getTowerDef } from '@/entities/registry';
import { ALL_TOWER_DEFS } from '@/content/towerDefs';
import { CHAPTER_BY_INDEX } from '@/content/chapters';

export type UnlockResult = { ok: true } | { ok: false; reason: string };

/** Returns whether the player can buy this tower right now. Reasons surface in the UI. */
export function canUnlockTower(kind: TowerKind, data: SaveDataLatest): UnlockResult {
  if (data.meta.unlockedTowers.includes(kind)) return { ok: false, reason: 'OWNED' };
  const def = getTowerDef(kind);
  const gateCh = def.unlockedByChapter;
  if (gateCh !== undefined && !data.meta.chapterUnlocks[gateCh]?.rewardClaimedAt) {
    return { ok: false, reason: `LOCKED · CHAPTER ${gateCh.toString().padStart(2, '0')}` };
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

export type TowerStoreEntry = {
  kind: TowerKind;
  state: 'owned' | 'buyable' | 'chapter-locked';
  chapterHint?: { idx: number; name: string };
};

export function getTowerStoreEntries(data: SaveDataLatest): TowerStoreEntry[] {
  const out: TowerStoreEntry[] = [];
  for (const def of ALL_TOWER_DEFS) {
    if (data.meta.unlockedTowers.includes(def.kind)) {
      out.push({ kind: def.kind, state: 'owned' });
      continue;
    }
    const gateCh = def.unlockedByChapter;
    if (gateCh !== undefined && !data.meta.chapterUnlocks[gateCh]?.rewardClaimedAt) {
      const ch = CHAPTER_BY_INDEX[gateCh];
      const hint = ch !== undefined
        ? { idx: gateCh, name: ch.name }
        : { idx: gateCh, name: `Chapter ${gateCh + 1}` };
      out.push({ kind: def.kind, state: 'chapter-locked', chapterHint: hint });
      continue;
    }
    out.push({ kind: def.kind, state: 'buyable' });
  }
  return out;
}

/** Tower kinds the player can see on the Towers screen right now (owned or
 *  buyable; excludes chapter-locked listings). The "new tower" badge is driven
 *  by comparing this set to `meta.seenTowers`. */
export function visibleTowerKinds(data: SaveDataLatest): TowerKind[] {
  return getTowerStoreEntries(data)
    .filter((e) => e.state !== 'chapter-locked')
    .map((e) => e.kind);
}

/** True when at least one currently-visible tower has not been acknowledged
 *  on the Towers screen yet. Drives the bottom-tab badge dot. */
export function hasUnseenTowers(data: SaveDataLatest): boolean {
  const seen = new Set(data.meta.seenTowers);
  for (const k of visibleTowerKinds(data)) {
    if (!seen.has(k)) return true;
  }
  return false;
}

/** Mark a single tower as acknowledged. Called when the player opens the
 *  detail dialog for that tower — the per-tile dot and tab badge clear once
 *  every newly-unlocked tower has been individually opened. */
export function markTowerSeen(kind: TowerKind, draft: SaveDataLatest): void {
  if (draft.meta.seenTowers.includes(kind)) return;
  draft.meta.seenTowers = [...draft.meta.seenTowers, kind];
}

/** True when this tower is currently visible to the player but its detail
 *  dialog has never been opened. Drives the per-tile dot. */
export function isTowerUnseen(kind: TowerKind, data: SaveDataLatest): boolean {
  if (data.meta.seenTowers.includes(kind)) return false;
  return visibleTowerKinds(data).includes(kind);
}
