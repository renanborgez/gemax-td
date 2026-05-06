# Chapter Progression — Design Spec

- **Date:** 2026-05-06
- **Status:** Draft, pending review
- **Scope:** Pre-launch progression layer for GeMax TD's 10-chapter campaign. Adds chapter-clear gates on tower availability, plus mastery medals and selectable HUD palettes per chapter.

## Problem

Players who shard-buy towers from early chapters have no structural reason to push deeper into the 10-chapter campaign. Shards scale only weakly with chapter (+5% per index), so grinding chapter 0–1 over and over is the optimal strategy for the entire tower roster. The campaign exists but doesn't gate anything meaningful.

This spec adds a chapter-progression spine before launch so players are pulled forward through the campaign on a known cadence. The gate is additive — it never removes the existing shard-cost system.

## Goals

- Each chapter clear surfaces a tangible, named reward.
- Tower roster unlocks are paced across chapters, not front-loadable via grinding.
- Returning players in later test builds keep their progress; the migration is loss-less.
- No engine, render, or determinism changes. Layer 1 simulation stays untouched.
- Implementation footprint stays small enough to ship in one focused chunk.

## Non-goals

- No mastery tiers (Hard/Brutal mastery, all-3-star achievements). Star system already exists; layering tiered mastery rewards is out of scope.
- No per-chapter quests or sub-objectives.
- No new currencies. Shards remain the only earnable economy resource.
- No retroactive cost rebate for towers purchased above their gating chapter under prior schema versions. Existing owners keep their towers; the migration only adjusts visibility for unbought towers.
- No bespoke chapter-clear audio cue in v1 — reuse the existing victory sting.

## Design choices (resolved during brainstorming)

- **Tower gate model:** Two gates required. Chapter clear unlocks the *listing*; the existing shard cost still applies to purchase.
- **What "cleared" means:** All ten Normal-difficulty missions for that chapter must be `cleared: true` in `SaveDataLatest.campaign`.
- **Tower → chapter mapping:** Authored, themed (not paced math). Draft below.
- **Visibility before clear:** Locked card shown in the tower store with chapter hint. Tap navigates to the gating chapter.
- **Per-chapter reward bundle:** Tower listing(s) where mapped, mastery medal (vanity), and a cosmetic HUD palette (chapter accent + secondary).

## Architecture

The progression layer lives entirely in the **meta** tier. Three concerns split across new files plus targeted edits to existing meta and UI code.

```
content/chapterRewards.ts     // authored: chapter idx → { towerKinds, paletteId, medalId }
meta/chapterProgress.ts       // derivation + reward award (pure)
meta/migrations/index.ts (extend)  // append v4→v5 migration, no auto-grant of towers
ui/screens/ChapterClearedScreen.tsx  // celebratory reward modal
```

Engine layer is not touched. Render layer is touched only at the existing match-end seam (`useGameSession.onMatchEnded`). UI layer renders the new state via existing zustand `hudStore` plumbing for the celebratory modal queue, and via the standard `useSave()` selector for store/chapter/settings screens.

### Flow at match end

```
onMatchEnded(world, won) [render/useGameSession.ts]:
  if (!won) return;
  store.update(draft => {
    const before = structuredClone(draft);
    applyMatchRewards(draft, ...);                  // existing — stars, shards, xp
    const newly = chaptersClearedNewly(before, draft);
    for (const chapterIdx of newly) {
      awardChapterClear(draft, chapterIdx);         // sets rewardClaimedAt
    }
    pendingClears = newly;
  });
  for (const chapterIdx of pendingClears) {
    bus.emit('chapter-cleared', { chapterIdx, rewards: CHAPTER_REWARDS[chapterIdx] });
  }
```

The diff between `before` and `draft` (rather than detection inside `applyMatchRewards`) keeps reward computation stateless and unit-testable, and lets a future debug menu manually toggle a chapter's `cleared` state without re-implementing the celebration logic.

### Tower store render

`TowersScreen` reads a new selector:

```ts
type TowerStoreEntry = {
  kind: TowerKind;
  state: 'owned' | 'buyable' | 'chapter-locked';
  chapterHint?: { idx: number; name: string };
};

function getTowerStoreEntries(save: SaveDataLatest): TowerStoreEntry[];
```

Entries are grouped in render: owned (top), buyable (middle), chapter-locked (bottom, dim styling, chapter name visible). Tap on a chapter-locked card navigates to `Chapters` then `LevelSelect` for the gating chapter, falling back to the chapter list if direct navigation isn't available.

## Components

### New: `src/content/chapterRewards.ts`

```ts
export type ChapterRewards = {
  readonly towerKinds: readonly TowerKind[];
  readonly paletteId: string;
  readonly medalId: string;
};

export const CHAPTER_REWARDS: Readonly<Record<number, ChapterRewards>> = {
  0: { towerKinds: ['firewall'],                 paletteId: 'palette/intranet',  medalId: 'medal/c0' },
  1: { towerKinds: ['machine-gun', 'marker'],    paletteId: 'palette/uplink',    medalId: 'medal/c1' },
  2: { towerKinds: ['sniper'],                   paletteId: 'palette/cloud',     medalId: 'medal/c2' },
  3: { towerKinds: ['emp', 'tesla-coil'],        paletteId: 'palette/mainframe', medalId: 'medal/c3' },
  4: { towerKinds: ['mortar'],                   paletteId: 'palette/firmware',  medalId: 'medal/c4' },
  5: { towerKinds: ['venom-spire', 'flamer'],    paletteId: 'palette/darknet',   medalId: 'medal/c5' },
  6: { towerKinds: ['ice-lance', 'cryo-field'],  paletteId: 'palette/quantum',   medalId: 'medal/c6' },
  7: { towerKinds: ['beam-cannon'],              paletteId: 'palette/logic',     medalId: 'medal/c7' },
  8: { towerKinds: ['plasma-cannon'],            paletteId: 'palette/void',      medalId: 'medal/c8' },
  9: { towerKinds: [],                           paletteId: 'palette/apex',      medalId: 'medal/c9' },
};
```

Total: 13 buyable towers across chapters 0–8. Chapter 9 (Apex, the finale) grants no tower — it is mastery and palette only, the "you finished everything" flex.

The mapping is themed: `firewall` to Intranet (literal name match), `ice-lance` + `cryo-field` to Quantum (cold/probability flavor), `plasma-cannon` to Void (heavy ordnance for the late game). The mapping is a pre-launch authoring call and is expected to iterate; the data layer has no opinion.

### New: `src/meta/chapterProgress.ts`

```ts
import { CHAPTERS } from '@/content/chapters';
import type { SaveDataLatest } from '@/meta/schema';

export function isChapterCleared(chapterIdx: number, save: SaveDataLatest): boolean {
  for (let m = 0; m < 10; m++) {
    const id = `lvl-c${chapterIdx}-m${m}`;
    if (!save.campaign[id]?.cleared) return false;
  }
  return true;
}

export function chapterClearProgress(
  chapterIdx: number,
  save: SaveDataLatest,
): { cleared: number; total: number } {
  let cleared = 0;
  for (let m = 0; m < 10; m++) {
    const id = `lvl-c${chapterIdx}-m${m}`;
    if (save.campaign[id]?.cleared) cleared++;
  }
  return { cleared, total: 10 };
}

export function chaptersClearedNewly(
  prev: SaveDataLatest,
  next: SaveDataLatest,
): number[] {
  const result: number[] = [];
  for (let ch = 0; ch < CHAPTERS.length; ch++) {
    const wasCleared = !!prev.meta.chapterUnlocks[ch]?.rewardClaimedAt;
    if (wasCleared) continue;                  // already celebrated; skip even if state corruption flips
    if (isChapterCleared(ch, next)) result.push(ch);
  }
  return result;
}

export function awardChapterClear(draft: SaveDataLatest, chapterIdx: number): void {
  if (draft.meta.chapterUnlocks[chapterIdx]?.rewardClaimedAt) return;  // idempotent
  draft.meta.chapterUnlocks = {
    ...draft.meta.chapterUnlocks,
    [chapterIdx]: { rewardClaimedAt: Date.now() },
  };
}
```

`isChapterCleared` derives from `campaign` rather than storing a redundant flag. The persisted `chapterUnlocks[ch].rewardClaimedAt` is the *one-shot guard* for the reward modal, not the source of truth for clear status.

### Edit: `src/content/types.ts`

Add to `TowerDef`:

```ts
/** Chapter index that must be cleared before the tower listing is purchasable. Omit for starters. */
unlockedByChapter?: number;
```

### Edit: `src/content/towerDefs.ts`

Each non-starter tower gets `unlockedByChapter` matching its CHAPTER_REWARDS placement:

```ts
{ kind: 'machine-gun', unlockCost: 30, unlockedByChapter: 1, ... }
{ kind: 'firewall',     unlockCost: ?,  unlockedByChapter: 0, ... }
// ... etc
```

(`firewall` currently has no `unlockCost` value visible in the file scan — implementation step verifies and assigns if missing.)

### Edit: `src/meta/schema.ts`

```ts
export type ChapterUnlockState = {
  rewardClaimedAt?: number;
};

export type SaveDataV5 = {
  profile: { createdAt: number; lastPlayedAt: number };
  campaign: Record<string, LevelProgress>;
  meta: {
    shards: number;
    techTree: Record<string, number>;
    unlockedTowers: TowerKind[];
    activeLoadout: (TowerKind | null)[];
    playerXp: number;
    playerLevel: number;
    lastPlayedLevelId?: string;
    chapterUnlocks: Record<number, ChapterUnlockState>;
    activePaletteId?: string;
  };
  settings: SaveSettings;
};

export const CURRENT_VERSION = 5 as const;
export type SaveDataLatest = SaveDataV5;
```

`blankSaveDataV5` initializes `chapterUnlocks: {}` and omits `activePaletteId`.

### Extend: `src/meta/migrations/index.ts` — append v4→v5

The migration registry already chains v1→v2→v3→v4. Append a `from: 4, to: 5` entry:

```ts
{
  from: 4,
  to: 5,
  migrate: (d) => {
    const v4 = d as SaveDataV4;
    const chapterUnlocks: Record<number, ChapterUnlockState> = {};
    for (let ch = 0; ch < CHAPTERS.length; ch++) {
      let allCleared = true;
      for (let m = 0; m < 10; m++) {
        if (!v4.campaign[`lvl-c${ch}-m${m}`]?.cleared) { allCleared = false; break; }
      }
      if (allCleared) {
        // Backdate to lastPlayedAt so chaptersClearedNewly() returns nothing on the first
        // post-update match end — returning players don't get celebration spam.
        chapterUnlocks[ch] = { rewardClaimedAt: v4.profile.lastPlayedAt };
      }
    }
    const v5: SaveDataV5 = {
      ...v4,
      meta: { ...v4.meta, chapterUnlocks },  // activePaletteId omitted (optional with exactOptionalPropertyTypes)
    };
    return v5;
  },
},
```

The migration deliberately does **not** auto-grant towers from `CHAPTER_REWARDS[ch].towerKinds` to `unlockedTowers`. The contract is "chapter clear unlocks the listing"; pre-v5 players still need to spend shards on towers they don't already own. Pre-v5 players who already bought towers above their chapter keep them — the migration is loss-less.

### Edit: `src/meta/loadout.ts`

Extend `canUnlockTower` to check the chapter gate before the shard balance check:

```ts
export function canUnlockTower(kind: TowerKind, data: SaveDataLatest): UnlockResult {
  if (data.meta.unlockedTowers.includes(kind)) return { ok: false, reason: 'OWNED' };
  const def = getTowerDef(kind);
  const gateCh = def.unlockedByChapter;
  if (gateCh !== undefined && !data.meta.chapterUnlocks[gateCh]?.rewardClaimedAt) {
    return { ok: false, reason: `LOCKED · CH ${gateCh + 1}` };
  }
  const cost = def.unlockCost ?? 0;
  if (cost === 0) return { ok: true };
  if (data.meta.shards < cost) return { ok: false, reason: `${cost - data.meta.shards} ◆ SHORT` };
  return { ok: true };
}
```

Add a new exported selector for the store screen:

```ts
export function getTowerStoreEntries(data: SaveDataLatest): TowerStoreEntry[];
```

### Edit: `src/engine/EventBus.ts`

```ts
export type SimEventMap = {
  // ... existing events ...
  'chapter-cleared': { chapterIdx: number; rewards: ChapterRewards };
};
```

Note: the engine itself never emits `chapter-cleared`. The event is published from the render layer (`useGameSession.onMatchEnded`) onto the same bus so the existing `eventBridge` plumbing carries it to `hudStore`. This keeps the wiring uniform without leaking save-state shape into the engine.

### Edit: `src/render/useGameSession.ts`

In `onMatchEnded`, after the existing `store.update` call, capture the clears returned by the closure and emit:

```ts
let pendingClears: number[] = [];
store.update((d) => {
  const before = structuredClone(d);
  // ... existing reward logic mutates d ...
  pendingClears = chaptersClearedNewly(before, d);
  for (const ch of pendingClears) awardChapterClear(d, ch);
});
for (const ch of pendingClears) {
  w.bus.emit('chapter-cleared', { chapterIdx: ch, rewards: CHAPTER_REWARDS[ch] });
}
```

### Edit: `src/ui/eventBridge.ts`

```ts
bus.on('chapter-cleared', ({ chapterIdx, rewards }) => {
  useHudStore.getState().enqueueChapterClear({ chapterIdx, rewards });
});
```

### Edit: `src/ui/hudStore.ts`

Add `pendingChapterClear: Array<{ chapterIdx: number; rewards: ChapterRewards }>` plus `enqueueChapterClear` and `dequeueChapterClear` actions.

### New: `src/ui/screens/ChapterClearedScreen.tsx`

A celebratory route inserted between `Play` and `Win` when a clear happened. Reads the head of `hudStore.pendingChapterClear`, renders chapter palette + tower icons + medal + palette name + Continue button. On dismiss, dequeues and routes to `Win` (or the next chapter clear if the queue still has entries — practically only one chapter clears per match, but the queue is correct).

If `pendingChapterClear` is empty when a match ends, `Win` shows directly as today.

### Edit: `src/app/screens/TowersScreen.tsx`

Replace the existing per-tower lookup loop with `getTowerStoreEntries(data)`. Render three states explicitly. Chapter-locked card uses dim accent (chapter's own `paletteAccent`) and shows chapter name. Tap navigates to `Chapters`.

### Edit: `src/app/screens/ChaptersScreen.tsx`

`computeUnlockedChapters` keeps its existing rule (sequential gate on previous-chapter clear-rate ≥ 0.5) — that gate is the *campaign* unlock, not the *reward* unlock, and is orthogonal to chapter-progression rewards. Augment the chapter card to show:

- Mastery medal icon when `chapterUnlocks[idx]?.rewardClaimedAt` is set
- Progress text: `cleared / 10` from `chapterClearProgress`

### Edit: `src/app/screens/SettingsScreen.tsx`

Add a "Theme" row beneath the existing audio/difficulty rows. Lists available palettes (default `auto` plus every chapter whose `rewardClaimedAt` is set). Selecting a palette writes `meta.activePaletteId` via `SaveStore.update`.

### Edit: `src/render/theme.ts` (or equivalent palette consumer)

When `meta.activePaletteId` is set, the HUD chrome and TitleScreen consume that palette's accent/secondary instead of the chapter-of-current-mission default. The in-match board nebula tints stay tied to the current mission's chapter — selectable palette overrides chrome only, not mission identity.

## Data flow summary

```
Match win (final mission of the 10th in chapter 3, say):
  1. onMatchEnded called with won=true
  2. store.update mutates campaign[lvl-c3-m9].cleared = true
  3. chaptersClearedNewly(before, draft) returns [3]
  4. awardChapterClear(draft, 3) sets chapterUnlocks[3] = { rewardClaimedAt: Date.now() }
  5. bus.emit('chapter-cleared', { chapterIdx: 3, rewards: CHAPTER_REWARDS[3] })
  6. eventBridge → hudStore.enqueueChapterClear(...)
  7. Navigation: Play → ChapterCleared (instead of Play → Win)
  8. ChapterClearedScreen displays towers unlocked + medal + palette
  9. Continue → dequeue → navigate to Win
```

```
Returning pre-v5 player launches v5 build:
  1. SaveStore loads pre-v5 blob, runs the chained migrations up through v4→v5
  2. Migration backfills chapterUnlocks for chapters already cleared
  3. rewardClaimedAt = lastPlayedAt (backdated)
  4. Player enters TowersScreen — sees previously-locked listings unlocked
  5. Player wins next match — chaptersClearedNewly returns [] (already claimed)
  6. No celebration spam, no surprise locked towers
```

## Error handling

- Missing campaign entries: treated as `cleared=false`. No throw.
- Unknown chapter index in `chapterUnlocks` (forward-compat from a future build): runtime ignores keys outside `0..CHAPTERS.length-1`. No throw.
- Unknown `activePaletteId`: falls back to `auto` (chapter-of-current-mission). No throw.
- `unlockedByChapter` referencing a chapter that doesn't exist: tower stays permanently chapter-locked, store renders "Coming soon" hint. Lets future content drops ship pre-flagged towers.
- `chaptersClearedNewly` is idempotent: even if `awardChapterClear` is called twice, `rewardClaimedAt` is preserved on the first call.
- Loadout staleness: a tower in `activeLoadout` whose chapter was retroactively unset (debug only) is *not* removed. Ownership is the truth; the chapter gate only blocks initial purchase.

## Testing

### Layer 1 (vitest, RN-free, target <2s)

`src/meta/__tests__/chapterProgress.spec.ts`:

- `isChapterCleared` returns false when any of the 10 missions is missing or `cleared=false`.
- `isChapterCleared` returns true when all 10 are present and cleared.
- `chapterClearProgress` returns the right `cleared / 10` count.
- `chaptersClearedNewly` returns the chapter when previously unclaimed and now cleared; empty when already claimed.
- `chaptersClearedNewly` handles multiple chapters becoming cleared simultaneously (synthetic, but contract-safe).
- `awardChapterClear` is idempotent — second call does not bump `rewardClaimedAt`.

`src/meta/__tests__/loadout.spec.ts` extension:

- `canUnlockTower` returns `LOCKED · CH N` for a tower whose chapter is unclaimed.
- Returns `OWNED` for already-owned towers regardless of chapter state.
- Returns `N ◆ SHORT` for buyable-but-broke when chapter is cleared.

`src/meta/__tests__/migrations.spec.ts` (or new):

- v4 with no clears → empty `chapterUnlocks`.
- v4 with one chapter fully cleared → `chapterUnlocks[ch].rewardClaimedAt` set.
- v4 with partial chapter (9/10 cleared) → that chapter not flagged.
- v4 with already-bought tower above its mapped chapter → `unlockedTowers` preserved.

`src/content/__tests__/chapterRewards.spec.ts`:

- Every `unlockedByChapter` value referenced from `towerDefs` exists in `CHAPTER_REWARDS`.
- Every tower kind in `CHAPTER_REWARDS[*].towerKinds` resolves to a valid `TowerDef`.
- Each non-starter tower kind appears in exactly one chapter's `towerKinds`.

### Layer 3 (jest-expo, smoke)

`src/app/__tests__/chapterClearedScreen.smoke.test.tsx`:

- Renders without crash given a synthetic `pendingChapterClear` queue entry.

`src/app/__tests__/towersScreen.smoke.test.tsx` extension:

- Renders three tower states (owned / buyable / chapter-locked) without crash.

## Open implementation questions

These are deferred to the implementation plan and are not blocking for the spec:

- The exact `unlockCost` value for `firewall` (not surfaced in the file scan during design) — implementation step verifies and assigns if missing.
- Whether `ChapterClearedScreen` is its own navigation route or a modal overlay on `Win`. Either works — implementation picks based on what RootNav already supports cleanly.
- Whether `meta.activePaletteId` is stored as `null` vs omitted (TS strictest setting `exactOptionalPropertyTypes` constrains the API; pick a convention during implementation).
