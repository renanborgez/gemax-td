# Chapter Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a chapter-clear gate on tower availability, plus mastery medals and selectable HUD palettes per chapter, so players have a paced reason to push through the 10-chapter campaign.

**Architecture:** All state lives in the meta layer (no engine/render/determinism changes). Tower listings are gated by `chapterUnlocks[N].rewardClaimedAt`; shard cost still applies. End-of-match diff detects newly-cleared chapters and emits `chapter-cleared` onto the existing event bus, which routes through `eventBridge` into a `hudStore` queue consumed by a new celebratory screen between `Play` and `Win`.

**Tech Stack:** TypeScript strictest, vitest (engine/meta), jest-expo (UI smoke), zustand (HUD store), React Navigation native-stack, Skia (rendering — untouched here).

**Spec:** `docs/superpowers/specs/2026-05-06-chapter-progression-design.md`

---

## File Structure

**New files (5):**
- `src/content/chapterRewards.ts` — authored chapter→rewards map
- `src/meta/chapterProgress.ts` — pure detection/award functions
- `src/meta/__tests__/chapterProgress.spec.ts` — vitest
- `src/content/__tests__/chapterRewards.spec.ts` — vitest
- `src/app/screens/ChapterClearedScreen.tsx` — celebratory route

**Modified files (10):**
- `src/meta/schema.ts` — add `SaveDataV5`, `ChapterUnlockState`, bump `CURRENT_VERSION`
- `src/meta/migrations/index.ts` — append v4→v5 entry
- `src/meta/migrations/__tests__/migrations.spec.ts` (or new) — v4→v5 cases
- `src/content/types.ts` — `TowerDef.unlockedByChapter?: number`
- `src/content/towerDefs.ts` — tag every chapter-gated tower
- `src/meta/loadout.ts` — chapter gate in `canUnlockTower`, new `getTowerStoreEntries`
- `src/meta/__tests__/loadout.spec.ts` (existing or new) — gate cases
- `src/engine/EventBus.ts` — add `'chapter-cleared'` event
- `src/render/useGameSession.ts` — diff before/after, emit chapter-cleared
- `src/ui/eventBridge.ts` — subscribe & enqueue
- `src/ui/hudStore.ts` — queue + actions
- `src/app/screens/TowersScreen.tsx` — render 3 states from selector
- `src/app/screens/ChaptersScreen.tsx` — mastery icon + progress count
- `src/app/screens/SettingsScreen.tsx` — Theme row
- `src/app/RootNav.tsx` — register `ChapterCleared` route
- `src/render/theme.ts` (or palette consumer) — `activePaletteId` override

---

## Test Strategy

- **Layer 1 (vitest, RN-free):** Pure functions in `meta/`, `content/`. Target <2s. All tests use synthetic `SaveDataLatest` fixtures.
- **Layer 3 (jest-expo):** Smoke tests for new screen and updated TowersScreen. Render-only, no behavioral assertions beyond "renders without crash given a synthetic prop set."
- **No integration tests.** End-to-end flow is verified by manually playing a clear in dev (final task).

---

### Task 1: Schema V5 types

**Files:**
- Modify: `src/meta/schema.ts`

- [ ] **Step 1: Add ChapterUnlockState type and SaveDataV5**

After the existing `SaveDataV4`/`PersistedBlobV4` block, before `CURRENT_VERSION`:

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
    /** Most recently entered level — used by the Title screen's CONTINUE affordance. */
    lastPlayedLevelId?: string;
    /** Per-chapter reward state. Presence of `rewardClaimedAt` means the chapter
     *  was cleared and the player has been credited their tower listing(s),
     *  medal, and palette. Absence means the celebration is still pending. */
    chapterUnlocks: Record<number, ChapterUnlockState>;
    /** When set, overrides the chapter-of-current-mission palette for HUD chrome
     *  and the TitleScreen. In-match board/nebula tints are always tied to the
     *  current mission's chapter regardless of this value. */
    activePaletteId?: string;
  };
  settings: SaveSettings;
};

export type PersistedBlobV5 = {
  version: 5;
  data: SaveDataV5;
};
```

- [ ] **Step 2: Bump CURRENT_VERSION and Latest aliases**

Replace the block at the bottom of `schema.ts`:

```ts
export const CURRENT_VERSION = 5 as const;
```

Add `blankSaveDataV5`:

```ts
export function blankSaveDataV5(now: number = Date.now()): SaveDataV5 {
  return {
    profile: { createdAt: now, lastPlayedAt: now },
    campaign: {},
    meta: {
      shards: 0,
      techTree: {},
      unlockedTowers: [...DEFAULT_UNLOCKED_TOWERS],
      activeLoadout: [...DEFAULT_LOADOUT],
      chapterUnlocks: {},
    },
    settings: {
      audioMaster: 1.0,
      sfx: 0.8,
      music: 0.8,
      difficultyDefault: 'normal',
      tutorialSeen: false,
    },
  };
}
```

Update aliases:

```ts
export type SaveDataLatest = SaveDataV5;
export type PersistedBlobLatest = PersistedBlobV5;
export const blankSaveDataLatest = blankSaveDataV5;
```

- [ ] **Step 3: Run engine typecheck**

Run: `npm run lint:tsc:engine`
Expected: PASS (no migration yet, but the schema additions don't break existing call sites — `chapterUnlocks` is required in `SaveDataV5.meta`, so any blank-data construction must go through `blankSaveDataV5`. The migration in Task 2 backfills it.)

If any existing code constructs a bare `meta: {...}` literal as `SaveDataLatest` (test fixtures, etc.), the typecheck flags it. Fix by adding `chapterUnlocks: {}` to those literals.

- [ ] **Step 4: Commit**

```bash
git add src/meta/schema.ts
git commit -m "feat(meta): add SaveDataV5 with chapterUnlocks + activePaletteId"
```

---

### Task 2: v4→v5 migration

**Files:**
- Modify: `src/meta/migrations/index.ts`
- Test: `src/meta/migrations/__tests__/migrations.spec.ts` (existing or new)

- [ ] **Step 1: Write the failing migration test**

If `src/meta/migrations/__tests__/migrations.spec.ts` does not exist, create it with this content. If it exists, append these cases.

```ts
import { describe, it, expect } from 'vitest';
import { runMigrations } from '@/meta/migrations';
import type { SaveDataV4, SaveDataV5 } from '@/meta/schema';

function v4Blob(data: Partial<SaveDataV4['meta']> = {}, campaign: SaveDataV4['campaign'] = {}): { version: 4; data: SaveDataV4 } {
  return {
    version: 4,
    data: {
      profile: { createdAt: 1000, lastPlayedAt: 2000 },
      campaign,
      meta: {
        shards: 0,
        techTree: {},
        unlockedTowers: ['bullet-turret', 'logic-bomb'],
        activeLoadout: ['bullet-turret', 'logic-bomb', null],
        ...data,
      },
      settings: {
        audioMaster: 1, sfx: 0.8, music: 0.8,
        difficultyDefault: 'normal', tutorialSeen: false,
      },
    },
  };
}

function fullChapter(ch: number): Record<string, { bestStarsByDifficulty: {}; bestWaveReached: number; cleared: boolean; shardsAwardedFor: [] }> {
  const out: Record<string, { bestStarsByDifficulty: {}; bestWaveReached: number; cleared: boolean; shardsAwardedFor: [] }> = {};
  for (let m = 0; m < 10; m++) {
    out[`lvl-c${ch}-m${m}`] = { bestStarsByDifficulty: {}, bestWaveReached: 0, cleared: true, shardsAwardedFor: [] };
  }
  return out;
}

describe('v4 → v5 migration', () => {
  it('adds empty chapterUnlocks for fresh v4 saves', () => {
    const out = runMigrations(v4Blob());
    expect(out.meta.chapterUnlocks).toEqual({});
  });

  it('backfills rewardClaimedAt for chapters fully cleared in campaign', () => {
    const out = runMigrations(v4Blob({}, fullChapter(0)));
    expect(out.meta.chapterUnlocks[0]?.rewardClaimedAt).toBe(2000);
  });

  it('does not flag partially-cleared chapters', () => {
    const partial = fullChapter(0);
    delete partial['lvl-c0-m9'];                // 9 of 10 cleared
    const out = runMigrations(v4Blob({}, partial));
    expect(out.meta.chapterUnlocks[0]).toBeUndefined();
  });

  it('preserves unlockedTowers verbatim (no auto-grant)', () => {
    const out = runMigrations(v4Blob({ unlockedTowers: ['bullet-turret', 'logic-bomb', 'sniper'] }, fullChapter(0)));
    expect(out.meta.unlockedTowers).toEqual(['bullet-turret', 'logic-bomb', 'sniper']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/meta/migrations/__tests__/migrations.spec.ts`
Expected: FAIL — `runMigrations` either throws "No migration path from v4 to v5" or returns data without `chapterUnlocks`.

- [ ] **Step 3: Add the v4→v5 migration entry**

In `src/meta/migrations/index.ts`, add `SaveDataV5` to the imports:

```ts
import {
  CURRENT_VERSION,
  DEFAULT_LOADOUT,
  DEFAULT_UNLOCKED_TOWERS,
  type ChapterUnlockState,
  type SaveDataLatest,
  type SaveDataV1,
  type SaveDataV2,
  type SaveDataV3,
  type SaveDataV4,
  type SaveDataV5,
} from '@/meta/schema';
import { CHAPTERS } from '@/content/chapters';
```

Append to the `MIGRATIONS` array (after the existing v3→v4 entry):

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
        // Backdate so chaptersClearedNewly() returns nothing on the first
        // post-update match end — returning players don't get celebration spam.
        chapterUnlocks[ch] = { rewardClaimedAt: v4.profile.lastPlayedAt };
      }
    }
    const v5: SaveDataV5 = {
      ...v4,
      meta: { ...v4.meta, chapterUnlocks },
    };
    return v5;
  },
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/meta/migrations/__tests__/migrations.spec.ts`
Expected: PASS — all four cases green.

- [ ] **Step 5: Run the full meta test suite to catch regressions**

Run: `npx vitest run src/meta`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/meta/migrations/index.ts src/meta/migrations/__tests__/migrations.spec.ts
git commit -m "feat(meta): v4→v5 migration backfills chapterUnlocks from campaign"
```

---

### Task 3: Chapter rewards registry

**Files:**
- Create: `src/content/chapterRewards.ts`
- Test: `src/content/__tests__/chapterRewards.spec.ts`

- [ ] **Step 1: Write the failing registry test**

Create `src/content/__tests__/chapterRewards.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CHAPTER_REWARDS } from '@/content/chapterRewards';
import { CHAPTERS } from '@/content/chapters';
import { ALL_TOWER_DEFS } from '@/content/towerDefs';
import type { TowerKind } from '@/content/types';

describe('CHAPTER_REWARDS', () => {
  it('has an entry for every chapter index', () => {
    for (const ch of CHAPTERS) {
      expect(CHAPTER_REWARDS[ch.index]).toBeDefined();
    }
  });

  it('every reward.towerKinds entry resolves to a TowerDef', () => {
    const kinds = new Set(ALL_TOWER_DEFS.map((d) => d.kind));
    for (const ch of CHAPTERS) {
      const rewards = CHAPTER_REWARDS[ch.index]!;
      for (const k of rewards.towerKinds) {
        expect(kinds).toContain(k);
      }
    }
  });

  it('every non-starter tower kind appears in exactly one chapter', () => {
    const STARTERS: readonly TowerKind[] = ['bullet-turret', 'logic-bomb'];
    const seen = new Map<TowerKind, number>();
    for (const ch of CHAPTERS) {
      for (const k of CHAPTER_REWARDS[ch.index]!.towerKinds) {
        seen.set(k, (seen.get(k) ?? 0) + 1);
      }
    }
    for (const def of ALL_TOWER_DEFS) {
      if (STARTERS.includes(def.kind)) continue;
      expect(seen.get(def.kind)).toBe(1);
    }
  });

  it('every paletteId and medalId is unique across chapters', () => {
    const palettes = new Set<string>();
    const medals = new Set<string>();
    for (const ch of CHAPTERS) {
      const r = CHAPTER_REWARDS[ch.index]!;
      expect(palettes.has(r.paletteId)).toBe(false);
      palettes.add(r.paletteId);
      expect(medals.has(r.medalId)).toBe(false);
      medals.add(r.medalId);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/__tests__/chapterRewards.spec.ts`
Expected: FAIL — `CHAPTER_REWARDS` not exported.

- [ ] **Step 3: Create the registry**

Create `src/content/chapterRewards.ts`:

```ts
import type { TowerKind } from '@/content/types';

export type ChapterRewards = {
  readonly towerKinds: readonly TowerKind[];
  readonly paletteId: string;
  readonly medalId: string;
};

/**
 * Per-chapter reward bundle. Each chapter clear (all 10 missions on Normal)
 * grants the listed tower listings (still cost shards), the medal (vanity),
 * and the palette (selectable HUD theme).
 *
 * Themed assignment — towers are matched to chapter narrative, not paced math.
 * Chapter 9 (Apex) is the cosmetic-only finale: medal + palette, no tower.
 */
export const CHAPTER_REWARDS: Readonly<Record<number, ChapterRewards>> = {
  0: { towerKinds: ['firewall'],                  paletteId: 'palette/intranet',  medalId: 'medal/c0' },
  1: { towerKinds: ['machine-gun', 'marker'],     paletteId: 'palette/uplink',    medalId: 'medal/c1' },
  2: { towerKinds: ['sniper'],                    paletteId: 'palette/cloud',     medalId: 'medal/c2' },
  3: { towerKinds: ['emp', 'tesla-coil'],         paletteId: 'palette/mainframe', medalId: 'medal/c3' },
  4: { towerKinds: ['mortar'],                    paletteId: 'palette/firmware',  medalId: 'medal/c4' },
  5: { towerKinds: ['venom-spire', 'flamer'],     paletteId: 'palette/darknet',   medalId: 'medal/c5' },
  6: { towerKinds: ['ice-lance', 'cryo-field'],   paletteId: 'palette/quantum',   medalId: 'medal/c6' },
  7: { towerKinds: ['beam-cannon'],               paletteId: 'palette/logic',     medalId: 'medal/c7' },
  8: { towerKinds: ['plasma-cannon'],             paletteId: 'palette/void',      medalId: 'medal/c8' },
  9: { towerKinds: [],                            paletteId: 'palette/apex',      medalId: 'medal/c9' },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/__tests__/chapterRewards.spec.ts`
Expected: PASS — all four cases green.

If "every non-starter tower kind appears in exactly one chapter" fails, the registry's tower-kind list is missing or duplicating a kind. Cross-check `ALL_TOWER_DEFS` against the mapping above — both should sum to 13 buyable towers.

- [ ] **Step 5: Commit**

```bash
git add src/content/chapterRewards.ts src/content/__tests__/chapterRewards.spec.ts
git commit -m "feat(content): add CHAPTER_REWARDS registry mapping chapters to tower/palette/medal"
```

---

### Task 4: TowerDef.unlockedByChapter wiring

**Files:**
- Modify: `src/content/types.ts`
- Modify: `src/content/towerDefs.ts`
- Test: `src/content/__tests__/chapterRewards.spec.ts` (extend)

- [ ] **Step 1: Extend the test to enforce towerDefs / CHAPTER_REWARDS consistency**

Append this case to `src/content/__tests__/chapterRewards.spec.ts`:

```ts
import { getTowerDef } from '@/entities/registry';
import { bootstrap } from '@/app/bootstrap';

describe('TowerDef.unlockedByChapter', () => {
  beforeAll(() => { bootstrap(); });

  it('matches the chapter that lists the tower in CHAPTER_REWARDS', () => {
    for (const [chStr, rewards] of Object.entries(CHAPTER_REWARDS)) {
      const ch = Number(chStr);
      for (const k of rewards.towerKinds) {
        const def = getTowerDef(k);
        expect(def.unlockedByChapter).toBe(ch);
      }
    }
  });

  it('starters have no unlockedByChapter', () => {
    bootstrap();
    expect(getTowerDef('bullet-turret').unlockedByChapter).toBeUndefined();
    expect(getTowerDef('logic-bomb').unlockedByChapter).toBeUndefined();
  });
});
```

(`beforeAll(bootstrap)` populates the registry — pure-TS engine tests need it.)

Also add the import line at the top:

```ts
import { beforeAll } from 'vitest';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/__tests__/chapterRewards.spec.ts`
Expected: FAIL — `unlockedByChapter` is `undefined` on every def.

- [ ] **Step 3: Add the field to TowerDef**

Edit `src/content/types.ts`. Find the `TowerDef` type and add the optional field:

```ts
export type TowerDef = {
  // ... existing fields ...
  /** Chapter index that must be cleared before this tower's listing is purchasable.
   *  Omit for starters and any tower available from the start. */
  unlockedByChapter?: number;
};
```

- [ ] **Step 4: Tag every chapter-gated tower in towerDefs.ts**

Edit `src/content/towerDefs.ts`. Add the field to each non-starter def per the CHAPTER_REWARDS mapping:

| Tower kind     | unlockedByChapter |
|----------------|-------------------|
| firewall       | 0                 |
| machine-gun    | 1                 |
| marker         | 1                 |
| sniper         | 2                 |
| emp            | 3                 |
| tesla-coil     | 3                 |
| mortar         | 4                 |
| venom-spire    | 5                 |
| flamer         | 5                 |
| ice-lance      | 6                 |
| cryo-field     | 6                 |
| beam-cannon    | 7                 |
| plasma-cannon  | 8                 |

For each of those `TowerDef` objects, insert `unlockedByChapter: <N>,` adjacent to `unlockCost` (or, for `firewall`, anywhere in the object literal — it has no `unlockCost`). Example for `MACHINE_GUN`:

```ts
export const MACHINE_GUN: TowerDef = {
  kind: 'machine-gun',
  // ...
  unlockCost: 30,
  unlockedByChapter: 1,
  rarity: 'uncommon',
};
```

For `FIREWALL` (currently has no `unlockCost`), add both — `firewall` is a free unlock gated only by chapter 0:

```ts
export const FIREWALL: TowerDef = {
  kind: 'firewall',
  // ...
  classRef: FirewallTower,
  description: 'Continuous hitscan beam. Reliable single-target chip damage.',
  unlockedByChapter: 0,
  rarity: 'common',
};
```

(Don't add `unlockCost` — firewall stays free; the chapter clear is the gate.)

Do **not** add `unlockedByChapter` to `BULLET_TURRET` or `LOGIC_BOMB`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/content/__tests__/chapterRewards.spec.ts`
Expected: PASS — all six cases.

- [ ] **Step 6: Run engine typecheck**

Run: `npm run lint:tsc:engine`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/content/types.ts src/content/towerDefs.ts src/content/__tests__/chapterRewards.spec.ts
git commit -m "feat(content): tag chapter-gated towers with unlockedByChapter"
```

---

### Task 5: chapterProgress.ts pure functions

**Files:**
- Create: `src/meta/chapterProgress.ts`
- Test: `src/meta/__tests__/chapterProgress.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/meta/__tests__/chapterProgress.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  isChapterCleared,
  chapterClearProgress,
  chaptersClearedNewly,
  awardChapterClear,
} from '@/meta/chapterProgress';
import { blankSaveDataLatest } from '@/meta/schema';
import type { SaveDataLatest, LevelProgress } from '@/meta/schema';

function withClears(chapter: number, count: number): SaveDataLatest {
  const save = blankSaveDataLatest();
  for (let m = 0; m < count; m++) {
    save.campaign[`lvl-c${chapter}-m${m}`] = clearedProgress();
  }
  return save;
}

function clearedProgress(): LevelProgress {
  return { bestStarsByDifficulty: {}, bestWaveReached: 0, cleared: true, shardsAwardedFor: [] };
}

describe('isChapterCleared', () => {
  it('returns false when no missions cleared', () => {
    expect(isChapterCleared(0, blankSaveDataLatest())).toBe(false);
  });

  it('returns false when 9 of 10 cleared', () => {
    expect(isChapterCleared(0, withClears(0, 9))).toBe(false);
  });

  it('returns true when all 10 cleared', () => {
    expect(isChapterCleared(0, withClears(0, 10))).toBe(true);
  });

  it('returns false when a mission entry exists but cleared=false', () => {
    const save = withClears(0, 10);
    save.campaign['lvl-c0-m5']!.cleared = false;
    expect(isChapterCleared(0, save)).toBe(false);
  });
});

describe('chapterClearProgress', () => {
  it('counts cleared missions out of 10', () => {
    expect(chapterClearProgress(0, withClears(0, 7))).toEqual({ cleared: 7, total: 10 });
  });
});

describe('chaptersClearedNewly', () => {
  it('returns chapters newly cleared (no prior reward)', () => {
    const before = withClears(0, 10);                    // cleared but no rewardClaimedAt
    const after = structuredClone(before);
    expect(chaptersClearedNewly(before, after)).toEqual([0]);
  });

  it('returns empty when prior reward already claimed', () => {
    const before = withClears(0, 10);
    before.meta.chapterUnlocks[0] = { rewardClaimedAt: 1234 };
    const after = structuredClone(before);
    expect(chaptersClearedNewly(before, after)).toEqual([]);
  });

  it('only returns chapters cleared in `next`, not `prev`', () => {
    const before = blankSaveDataLatest();                // empty
    const after = withClears(0, 10);                     // ch0 freshly cleared
    expect(chaptersClearedNewly(before, after)).toEqual([0]);
  });
});

describe('awardChapterClear', () => {
  it('sets rewardClaimedAt on first call', () => {
    const save = blankSaveDataLatest();
    awardChapterClear(save, 3);
    expect(save.meta.chapterUnlocks[3]?.rewardClaimedAt).toBeTypeOf('number');
  });

  it('is idempotent — second call does not bump rewardClaimedAt', () => {
    const save = blankSaveDataLatest();
    awardChapterClear(save, 3);
    const first = save.meta.chapterUnlocks[3]!.rewardClaimedAt;
    awardChapterClear(save, 3);
    expect(save.meta.chapterUnlocks[3]!.rewardClaimedAt).toBe(first);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/meta/__tests__/chapterProgress.spec.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create chapterProgress.ts**

Create `src/meta/chapterProgress.ts`:

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
    if (prev.meta.chapterUnlocks[ch]?.rewardClaimedAt) continue;
    if (isChapterCleared(ch, next)) result.push(ch);
  }
  return result;
}

export function awardChapterClear(draft: SaveDataLatest, chapterIdx: number): void {
  if (draft.meta.chapterUnlocks[chapterIdx]?.rewardClaimedAt) return;
  draft.meta.chapterUnlocks = {
    ...draft.meta.chapterUnlocks,
    [chapterIdx]: { rewardClaimedAt: Date.now() },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/meta/__tests__/chapterProgress.spec.ts`
Expected: PASS — all nine cases green.

- [ ] **Step 5: Commit**

```bash
git add src/meta/chapterProgress.ts src/meta/__tests__/chapterProgress.spec.ts
git commit -m "feat(meta): add chapterProgress derivation + reward-award helpers"
```

---

### Task 6: Chapter gate in canUnlockTower

**Files:**
- Modify: `src/meta/loadout.ts`
- Test: `src/meta/__tests__/loadout.spec.ts` (existing or new)

- [ ] **Step 1: Add failing tests for the chapter gate**

If `src/meta/__tests__/loadout.spec.ts` exists, append. If not, create:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { canUnlockTower } from '@/meta/loadout';
import { blankSaveDataLatest } from '@/meta/schema';
import { bootstrap } from '@/app/bootstrap';

describe('canUnlockTower chapter gate', () => {
  beforeAll(() => { bootstrap(); });

  it('returns chapter-locked reason when chapter not cleared', () => {
    const save = blankSaveDataLatest();
    save.meta.shards = 9999;                    // shards plentiful
    const result = canUnlockTower('sniper', save);   // sniper is unlockedByChapter: 2
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/CH/);
  });

  it('returns ok when chapter cleared and shards sufficient', () => {
    const save = blankSaveDataLatest();
    save.meta.shards = 9999;
    save.meta.chapterUnlocks[2] = { rewardClaimedAt: 1 };
    const result = canUnlockTower('sniper', save);
    expect(result.ok).toBe(true);
  });

  it('still returns shard-short when chapter cleared but broke', () => {
    const save = blankSaveDataLatest();
    save.meta.shards = 0;
    save.meta.chapterUnlocks[2] = { rewardClaimedAt: 1 };
    const result = canUnlockTower('sniper', save);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/SHORT/);
  });

  it('OWNED takes precedence over chapter gate', () => {
    const save = blankSaveDataLatest();
    save.meta.unlockedTowers = [...save.meta.unlockedTowers, 'sniper'];
    // chapter NOT cleared, but already owned (e.g., grandfathered from older save)
    const result = canUnlockTower('sniper', save);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('OWNED');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/meta/__tests__/loadout.spec.ts`
Expected: FAIL — chapter gate not yet enforced; sniper test passes when shards sufficient (false positive) until the gate is added.

- [ ] **Step 3: Add the chapter gate**

Edit `src/meta/loadout.ts`. Replace the body of `canUnlockTower`:

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

The order matters: OWNED first (preserves existing-owner contract), then chapter, then shards. Free towers (`unlockCost === 0`) skip the shard check but still hit the chapter gate.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/meta/__tests__/loadout.spec.ts`
Expected: PASS — four cases green.

- [ ] **Step 5: Commit**

```bash
git add src/meta/loadout.ts src/meta/__tests__/loadout.spec.ts
git commit -m "feat(meta): chapter-clear gate in canUnlockTower (precedes shard cost)"
```

---

### Task 7: getTowerStoreEntries selector

**Files:**
- Modify: `src/meta/loadout.ts`
- Modify: `src/meta/__tests__/loadout.spec.ts`

- [ ] **Step 1: Add failing test for the selector**

Append to `src/meta/__tests__/loadout.spec.ts`:

```ts
import { getTowerStoreEntries } from '@/meta/loadout';

describe('getTowerStoreEntries', () => {
  beforeAll(() => { bootstrap(); });

  it('marks starters as owned', () => {
    const entries = getTowerStoreEntries(blankSaveDataLatest());
    const turret = entries.find((e) => e.kind === 'bullet-turret');
    expect(turret?.state).toBe('owned');
  });

  it('marks chapter-locked towers with chapterHint', () => {
    const entries = getTowerStoreEntries(blankSaveDataLatest());
    const sniper = entries.find((e) => e.kind === 'sniper');     // ch2-gated
    expect(sniper?.state).toBe('chapter-locked');
    expect(sniper?.chapterHint?.idx).toBe(2);
    expect(sniper?.chapterHint?.name).toBeTruthy();
  });

  it('marks tower as buyable when chapter cleared and not owned', () => {
    const save = blankSaveDataLatest();
    save.meta.chapterUnlocks[2] = { rewardClaimedAt: 1 };
    const entries = getTowerStoreEntries(save);
    const sniper = entries.find((e) => e.kind === 'sniper');
    expect(sniper?.state).toBe('buyable');
    expect(sniper?.chapterHint).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/meta/__tests__/loadout.spec.ts`
Expected: FAIL — `getTowerStoreEntries` not exported.

- [ ] **Step 3: Add the selector**

Edit `src/meta/loadout.ts`. Add at the bottom:

```ts
import { ALL_TOWER_DEFS } from '@/content/towerDefs';
import { CHAPTER_BY_INDEX } from '@/content/chapters';

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
```

(Make sure the existing `import` block at the top of `loadout.ts` already has `ALL_TOWER_DEFS` and `CHAPTER_BY_INDEX`. If not, add them — don't duplicate the import line; merge into the existing imports.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/meta/__tests__/loadout.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/meta/loadout.ts src/meta/__tests__/loadout.spec.ts
git commit -m "feat(meta): getTowerStoreEntries selector for 3-state tower store"
```

---

### Task 8: EventBus chapter-cleared event + emit from useGameSession

**Files:**
- Modify: `src/engine/EventBus.ts`
- Modify: `src/render/useGameSession.ts`

- [ ] **Step 1: Add `chapter-cleared` to SimEventMap**

Edit `src/engine/EventBus.ts`. Update the type:

```ts
import type { ChapterRewards } from '@/content/chapterRewards';

export type SimEventMap = {
  // ... existing entries unchanged ...
  /** Emitted from the render layer at end-of-match when a chapter newly clears.
   *  Engine itself never emits this — the bus just acts as a pre-existing
   *  delivery channel into eventBridge / hudStore. */
  'chapter-cleared': { chapterIdx: number; rewards: ChapterRewards };
};
```

- [ ] **Step 2: Run engine typecheck**

Run: `npm run lint:tsc:engine`
Expected: PASS — adding an event key is non-breaking.

- [ ] **Step 3: Wire the diff + emit in useGameSession**

Edit `src/render/useGameSession.ts`. Update the `onMatchEnded` block. Replace the existing `if (won) { ... }` body. Pseudo-diff (the `won === true` path is the only change; the `won === false` path keeps `audio.playSfx('lose')`):

```ts
import { chaptersClearedNewly, awardChapterClear } from '@/meta/chapterProgress';
import { CHAPTER_REWARDS } from '@/content/chapterRewards';

// Inside onMatchEnded, when won:
if (won) {
  let pendingClears: number[] = [];
  store.update((d) => {
    const before = structuredClone(d);

    // === existing reward logic begins ===
    const lvl = (d.campaign[world.level.id] ??= {
      bestStarsByDifficulty: {}, bestWaveReached: 0, cleared: false, shardsAwardedFor: [],
    });
    const prev = lvl.bestStarsByDifficulty[opts.difficulty] ?? 0;
    if (stars > prev) lvl.bestStarsByDifficulty[opts.difficulty] = stars;
    lvl.cleared = true;
    lvl.bestWaveReached = world.waveDirector.totalWaves;
    if (!lvl.shardsAwardedFor.includes(opts.difficulty)) {
      const award = shardRewardForMatch({
        stars,
        chapter: world.level.chapter,
        shardRewardMult: world.difficulty.shardRewardMult * world.effects.globals.shardRewardMult,
      });
      d.meta.shards += award;
      lvl.shardsAwardedFor.push(opts.difficulty);
    }
    // === existing reward logic ends ===

    pendingClears = chaptersClearedNewly(before, d);
    for (const ch of pendingClears) {
      awardChapterClear(d, ch);
    }
  });
  refresh();
  audio.playSfx('win');
  for (const ch of pendingClears) {
    world.bus.emit('chapter-cleared', { chapterIdx: ch, rewards: CHAPTER_REWARDS[ch]! });
  }
}
```

Note: the `for` loop uses `world` (the local `w` in the existing block — the existing variable name in `useGameSession`). Verify the local name when editing; the spec uses `world` for clarity but match the file.

- [ ] **Step 4: Run engine typecheck and full typecheck**

Run: `npm run lint:tsc:engine && npm run tsc`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/EventBus.ts src/render/useGameSession.ts
git commit -m "feat(render): emit chapter-cleared on end-of-match clear-diff"
```

---

### Task 9: hudStore queue + eventBridge wiring

**Files:**
- Modify: `src/ui/hudStore.ts`
- Modify: `src/ui/eventBridge.ts`

- [ ] **Step 1: Add the queue + actions to hudStore**

Edit `src/ui/hudStore.ts`. Add to `HudState`:

```ts
import type { ChapterRewards } from '@/content/chapterRewards';

export type ChapterClearPayload = { chapterIdx: number; rewards: ChapterRewards };

export type HudState = {
  // ... existing fields ...
  pendingChapterClear: ChapterClearPayload[];
};
```

Add to `HudActions`:

```ts
export type HudActions = {
  // ... existing actions ...
  enqueueChapterClear(p: ChapterClearPayload): void;
  dequeueChapterClear(): void;
};
```

Update `INITIAL`:

```ts
const INITIAL: HudState = {
  // ... existing fields ...
  pendingChapterClear: [],
};
```

Add to `useHudStore`:

```ts
enqueueChapterClear: (p) => set((s) => ({ pendingChapterClear: [...s.pendingChapterClear, p] })),
dequeueChapterClear: () => set((s) => ({ pendingChapterClear: s.pendingChapterClear.slice(1) })),
```

- [ ] **Step 2: Wire the bridge**

Edit `src/ui/eventBridge.ts`. Append a new subscription inside `attachEventBridge`:

```ts
offs.push(bus.on('chapter-cleared', (payload) => {
  useHudStore.getState().enqueueChapterClear(payload);
}));
```

- [ ] **Step 3: Run typecheck**

Run: `npm run tsc`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ui/hudStore.ts src/ui/eventBridge.ts
git commit -m "feat(ui): pendingChapterClear queue + bridge subscription"
```

---

### Task 10: ChapterClearedScreen route

**Files:**
- Create: `src/app/screens/ChapterClearedScreen.tsx`
- Modify: `src/app/RootNav.tsx`
- Modify: `src/render/useGameSession.ts` (or PlayScreen — wherever Win is currently navigated to)
- Test: `src/app/__tests__/chapterClearedScreen.smoke.test.tsx`

- [ ] **Step 1: Locate the existing Play→Win navigation point**

Run: `grep -rn "navigate('Win'" src/app src/render src/ui 2>/dev/null`
Note the file and line. The new screen must be inserted before that nav call when `pendingChapterClear` is non-empty.

- [ ] **Step 2: Add the smoke test (will fail until screen exists)**

Create `src/app/__tests__/chapterClearedScreen.smoke.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { ChapterClearedScreen } from '@/app/screens/ChapterClearedScreen';
import { useHudStore } from '@/ui/hudStore';

describe('ChapterClearedScreen', () => {
  it('renders without crash given a pending payload', () => {
    useHudStore.setState({
      pendingChapterClear: [{
        chapterIdx: 0,
        rewards: {
          towerKinds: ['firewall'],
          paletteId: 'palette/intranet',
          medalId: 'medal/c0',
        },
      }],
    });

    const navigation = { replace: () => {}, navigate: () => {} } as any;
    const route = { params: {} } as any;
    expect(() => render(<ChapterClearedScreen navigation={navigation} route={route} />)).not.toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/app/__tests__/chapterClearedScreen.smoke.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 4: Create the screen**

Create `src/app/screens/ChapterClearedScreen.tsx`:

```tsx
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { SectionCard } from '@/ui/components/SectionCard';
import { useHudStore } from '@/ui/hudStore';
import { CHAPTER_BY_INDEX } from '@/content/chapters';
import { getTowerDef } from '@/entities/registry';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ChapterCleared'>;

export function ChapterClearedScreen({ navigation, route }: Props) {
  const head = useHudStore((s) => s.pendingChapterClear[0]);
  const dequeue = useHudStore((s) => s.dequeueChapterClear);

  const chapter = head ? CHAPTER_BY_INDEX[head.chapterIdx] : undefined;

  const towerNames = useMemo(() => {
    if (!head) return [];
    return head.rewards.towerKinds.map((k) => getTowerDef(k).displayName);
  }, [head]);

  if (!head || !chapter) {
    // Defensive: if mounted with empty queue, bounce to Win immediately.
    React.useEffect(() => {
      navigation.replace('Win', route.params.winParams);
    }, []);
    return null;
  }

  const onContinue = () => {
    dequeue();
    if (useHudStore.getState().pendingChapterClear.length > 0) {
      navigation.replace('ChapterCleared', route.params);
    } else {
      navigation.replace('Win', route.params.winParams);
    }
  };

  return (
    <ScreenShell sectionTitle="Chapter Cleared" onBack={onContinue}>
      <View style={styles.hero}>
        <Text style={[styles.heroLabel, { color: chapter.paletteAccent }]}>CHAPTER {chapter.index + 1} CLEARED</Text>
        <Text style={styles.heroName}>{chapter.name.toUpperCase()}</Text>
        <Text style={styles.heroSubtitle}>{chapter.subtitle}</Text>
      </View>

      {towerNames.length > 0 && (
        <SectionCard title="TOWER LISTINGS UNLOCKED">
          {towerNames.map((n) => (
            <Text key={n} style={styles.rewardItem}>· {n}</Text>
          ))}
        </SectionCard>
      )}

      <SectionCard title="MASTERY">
        <Text style={styles.rewardItem}>· {head.rewards.medalId}</Text>
        <Text style={styles.rewardItem}>· Palette unlocked: {head.rewards.paletteId}</Text>
      </SectionCard>

      <Pressable onPress={onContinue} style={[styles.btn, { backgroundColor: chapter.paletteAccent }]}>
        <Text style={styles.btnText}>CONTINUE</Text>
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: SPACING.xs, paddingVertical: SPACING.md },
  heroLabel: { ...TEXT.labelSmall, letterSpacing: 2, fontSize: 12 },
  heroName: { ...TEXT.title, color: COLORS.textPrimary, fontSize: 22, letterSpacing: 3 },
  heroSubtitle: { ...TEXT.body, color: COLORS.textMuted, fontSize: 12 },
  rewardItem: { ...TEXT.body, color: COLORS.textPrimary, fontSize: 13, paddingVertical: 2 },
  btn: { paddingVertical: SPACING.md, alignItems: 'center', borderRadius: RADIUS.md, marginTop: SPACING.md },
  btnText: { ...TEXT.button, color: COLORS.textOnAccent },
});
```

- [ ] **Step 5: Register the route in RootNav**

Edit `src/app/RootNav.tsx`. Add to imports:

```ts
import { ChapterClearedScreen } from '@/app/screens/ChapterClearedScreen';
```

Add to the `RootStackParamList` (find the existing type):

```ts
ChapterCleared: { winParams: RootStackParamList['Win'] };
```

Add the `Stack.Screen` line near the existing `Win` registration:

```tsx
<Stack.Screen name="ChapterCleared" component={ChapterClearedScreen} />
```

- [ ] **Step 6: Update the Play→Win navigation seam**

In whichever file currently calls `navigation.navigate('Win', winParams)` after `onMatchEnded` — typically `src/app/screens/PlayScreen.tsx`:

```tsx
const winParams = { levelId, difficulty, stars, shards, totalWaves };
if (useHudStore.getState().pendingChapterClear.length > 0) {
  navigation.replace('ChapterCleared', { winParams });
} else {
  navigation.replace('Win', winParams);
}
```

If `PlayScreen` doesn't currently make this call (the navigation might happen elsewhere — e.g., in a `useEffect` watching match state), apply the same conditional in that location. Run grep from Step 1 to confirm.

- [ ] **Step 7: Run tests**

Run: `npx jest src/app/__tests__/chapterClearedScreen.smoke.test.tsx && npm run tsc`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/screens/ChapterClearedScreen.tsx src/app/RootNav.tsx \
        src/app/screens/PlayScreen.tsx \
        src/app/__tests__/chapterClearedScreen.smoke.test.tsx
git commit -m "feat(ui): ChapterClearedScreen route inserted between Play and Win"
```

(Adjust the `git add` if PlayScreen wasn't the seam — add whichever file changed in Step 6.)

---

### Task 11: TowersScreen 3-state rendering

**Files:**
- Modify: `src/app/screens/TowersScreen.tsx`

- [ ] **Step 1: Read the existing TowersScreen layout**

Run: `cat src/app/screens/TowersScreen.tsx | head -100`
Note where the tower-card iteration happens (currently around line 138 / 245 / 314 from the design doc's grep).

- [ ] **Step 2: Replace the per-tower lookup with the new selector**

Edit `src/app/screens/TowersScreen.tsx`. Replace the existing iteration that uses `data.meta.unlockedTowers.includes(...)` and per-card `canUnlockTower` calls with a single call:

```ts
import { getTowerStoreEntries, type TowerStoreEntry } from '@/meta/loadout';

// Inside the component, replace the manual mapping:
const entries = useMemo(() => getTowerStoreEntries(data), [data]);
```

Render entries grouped by state. For each entry:

- `state === 'owned'`: existing owned-card layout.
- `state === 'buyable'`: existing unlock-affordance layout (cost in shards).
- `state === 'chapter-locked'`: dim card with chapter hint, tap → navigate to chapter.

Replace the existing per-card branch logic. The exact JSX depends on the existing card structure; preserve the current visual language but switch on `entry.state`.

For the chapter-locked branch (new):

```tsx
const lockedAccent = (() => {
  const ch = CHAPTER_BY_INDEX[entry.chapterHint!.idx];
  return ch?.paletteAccent ?? COLORS.textMuted;
})();

<Pressable
  onPress={() => navigation.navigate('Chapters')}
  style={[styles.card, styles.cardLocked]}
>
  <Text style={[styles.lockHint, { color: lockedAccent }]}>
    LOCKED · {entry.chapterHint!.name.toUpperCase()}
  </Text>
  <Text style={styles.lockSubtitle}>Clear Chapter {entry.chapterHint!.idx + 1} to unlock listing</Text>
</Pressable>
```

(Use the `CHAPTER_BY_INDEX` import from `@/content/chapters`.)

- [ ] **Step 3: Run typecheck**

Run: `npm run tsc`
Expected: PASS.

- [ ] **Step 4: Manual smoke (optional, if dev environment available)**

Run: `npx expo start` and verify locked / buyable / owned cards all render. Skip if the environment isn't set up — the typecheck catches structural breakage.

- [ ] **Step 5: Commit**

```bash
git add src/app/screens/TowersScreen.tsx
git commit -m "feat(ui): TowersScreen renders chapter-locked state via getTowerStoreEntries"
```

---

### Task 12: ChaptersScreen mastery icon + progress count

**Files:**
- Modify: `src/app/screens/ChaptersScreen.tsx`

- [ ] **Step 1: Wire chapter clear progress and mastery flag into the chapter card**

Edit `src/app/screens/ChaptersScreen.tsx`. Add imports:

```ts
import { chapterClearProgress } from '@/meta/chapterProgress';
import { Ionicons } from '@expo/vector-icons';   // existing pattern in this codebase
```

Inside the `ChaptersScreen` component, when iterating chapters, compute:

```ts
const progress = chapterClearProgress(def.index, data);
const mastered = !!data.meta.chapterUnlocks[def.index]?.rewardClaimedAt;
```

Pass into `ChapterCard`:

```tsx
<ChapterCard
  def={def}
  unlocked={unlockedSet.has(def.index)}
  stats={stats}
  progress={progress}
  mastered={mastered}
  onPress={() => navigation.navigate('LevelSelect', { chapter: def.index })}
/>
```

Update `ChapterCard` props:

```ts
function ChapterCard({
  def,
  unlocked,
  stats,
  progress,
  mastered,
  onPress,
}: {
  def: ChapterDef;
  unlocked: boolean;
  stats: ChapterStats;
  progress: { cleared: number; total: number };
  mastered: boolean;
  onPress: () => void;
}) { /* ... */ }
```

Render the new info inside the card, near the chapter index/name:

```tsx
<View style={styles.metaRow}>
  <Text style={styles.progress}>{progress.cleared}/{progress.total} CLEARED</Text>
  {mastered && (
    <Ionicons name="medal" size={14} color={def.paletteAccent} />
  )}
</View>
```

Add the styles:

```ts
metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
progress: { ...TEXT.labelSmall, color: COLORS.textMuted, fontSize: 10 },
```

- [ ] **Step 2: Run typecheck**

Run: `npm run tsc`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/screens/ChaptersScreen.tsx
git commit -m "feat(ui): chapter card shows clear-progress + mastery medal"
```

---

### Task 13: Settings palette picker + activePaletteId wiring

**Files:**
- Modify: `src/app/screens/SettingsScreen.tsx`

- [ ] **Step 1: Compute available palettes from save**

Edit `src/app/screens/SettingsScreen.tsx`. Add imports:

```ts
import { CHAPTERS, CHAPTER_BY_INDEX } from '@/content/chapters';
import { CHAPTER_REWARDS } from '@/content/chapterRewards';
```

Inside the screen component, compute the palette options:

```ts
const palettes = useMemo(() => {
  const earned = CHAPTERS.filter((ch) => !!data.meta.chapterUnlocks[ch.index]?.rewardClaimedAt);
  return [
    { id: 'auto', label: 'Auto (current chapter)' },
    ...earned.map((ch) => ({
      id: CHAPTER_REWARDS[ch.index]!.paletteId,
      label: ch.name,
      accent: ch.paletteAccent,
    })),
  ];
}, [data.meta.chapterUnlocks]);

const activeId = data.meta.activePaletteId ?? 'auto';

const setPalette = (id: string) => {
  store.update((d) => {
    if (id === 'auto') {
      delete d.meta.activePaletteId;
    } else {
      d.meta.activePaletteId = id;
    }
  });
  refresh();   // existing pattern in this screen
};
```

Render a row beneath the existing audio/difficulty rows:

```tsx
<SectionCard title="THEME">
  {palettes.map((p) => (
    <Pressable
      key={p.id}
      onPress={() => setPalette(p.id)}
      style={[styles.themeRow, activeId === p.id && styles.themeRowActive]}
    >
      <Text style={[styles.themeLabel, p.accent ? { color: p.accent } : undefined]}>
        {p.label.toUpperCase()}
      </Text>
      {activeId === p.id && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
    </Pressable>
  ))}
</SectionCard>
```

Add the styles:

```ts
themeRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingVertical: SPACING.sm,
  borderBottomWidth: 1,
  borderBottomColor: COLORS.bgElevated,
},
themeRowActive: { backgroundColor: COLORS.bgElevated },
themeLabel: { ...TEXT.label, color: COLORS.textPrimary, letterSpacing: 1.5, fontSize: 12 },
```

- [ ] **Step 2: Run typecheck**

Run: `npm run tsc`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/screens/SettingsScreen.tsx
git commit -m "feat(ui): Settings Theme row to pick earned chapter palette"
```

---

### Task 14: HUD palette consumer (theme override)

**Files:**
- Modify: `src/render/theme.ts` (or wherever HUD/TitleScreen reads chapter palette)

This task is intentionally light. The spec says: *"`activePaletteId` overrides HUD chrome and TitleScreen accent/secondary; in-match board/nebula tints stay tied to the current mission's chapter."*

- [ ] **Step 1: Locate the palette consumer**

Run: `grep -rn "paletteAccent\|paletteSecondary" src/render src/ui src/app | grep -v __tests__ | head -20`
This shows which components consume the chapter palette today. The intervention point is wherever a component reads `chapter.paletteAccent` for chrome (HUD frame, TitleScreen, etc.) — *not* mission-board layers.

- [ ] **Step 2: Add a small selector helper**

Choose a host file (suggested: `src/meta/loadout.ts` or new `src/meta/palette.ts`). Add:

```ts
import { CHAPTERS, CHAPTER_BY_INDEX } from '@/content/chapters';
import { CHAPTER_REWARDS } from '@/content/chapterRewards';

/** Resolve the active HUD/TitleScreen palette. Falls back to the chapter
 *  passed in (default behavior) when no override is set or the override
 *  references a palette not earned by the player. */
export function resolveChromePalette(
  data: SaveDataLatest,
  fallbackChapterIdx: number,
): { accent: string; secondary: string } {
  const id = data.meta.activePaletteId;
  if (id && id !== 'auto') {
    const found = CHAPTERS.find((ch) => CHAPTER_REWARDS[ch.index]?.paletteId === id);
    if (found && data.meta.chapterUnlocks[found.index]?.rewardClaimedAt) {
      return { accent: found.paletteAccent, secondary: found.paletteSecondary };
    }
  }
  const ch = CHAPTER_BY_INDEX[fallbackChapterIdx] ?? CHAPTERS[0]!;
  return { accent: ch.paletteAccent, secondary: ch.paletteSecondary };
}
```

- [ ] **Step 3: Wire it into the HUD chrome consumer(s)**

In each consumer identified in Step 1 that draws *chrome* (HUD frame around the play area, TitleScreen accent), replace direct reads of `chapter.paletteAccent` / `chapter.paletteSecondary` with `resolveChromePalette(data, chapterIdx)`.

Do **not** touch components that render the in-match board nebula or mission-themed art — those keep their direct chapter reads.

If unsure whether a consumer is chrome or mission art, leave it alone for v1. Players can still earn palettes; a future iteration can extend coverage.

- [ ] **Step 4: Run typecheck**

Run: `npm run tsc`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/meta/palette.ts src/<consumer files>
git commit -m "feat(render): activePaletteId overrides HUD chrome palette"
```

---

### Task 15: Final verification

**Files:** None

- [ ] **Step 1: Run all tests**

Run: `npm run test:engine && npm run lint:tsc:engine && npm run tsc`
Expected: PASS for all three.

- [ ] **Step 2: Run RN smoke tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Manual end-to-end check (if dev environment is available)**

In `npx expo start`, complete a quick playthrough of chapter 0 — clear all 10 missions on Normal. Verify:

1. After the 10th mission win, ChapterClearedScreen appears with chapter 0 hero text and `firewall` listed under TOWER LISTINGS UNLOCKED.
2. Tap CONTINUE → WinScreen appears as today.
3. From the title menu, navigate to TowersScreen — `firewall` is now visible as a buyable card (or owned, if it was already free-unlocked under v4 saves).
4. Navigate to ChaptersScreen — chapter 0 card shows `10/10 CLEARED` and a medal icon.
5. Navigate to SettingsScreen → THEME row — `Intranet` palette is selectable.

If you can't run the device build, skip this step and rely on the test suites.

- [ ] **Step 4: No-op commit / push (if applicable)**

The plan completes after Step 3. Each task above committed separately, so `git log` should show ~14 fresh commits stacked on top of the spec commits.

---

## Self-Review Notes

**Spec coverage check:**

| Spec section                          | Plan task |
|---------------------------------------|-----------|
| `SaveDataV5` + `ChapterUnlockState`   | Task 1    |
| v4→v5 migration                        | Task 2    |
| `chapterRewards.ts` registry          | Task 3    |
| `TowerDef.unlockedByChapter`          | Task 4    |
| `chapterProgress.ts`                  | Task 5    |
| `canUnlockTower` chapter gate         | Task 6    |
| `getTowerStoreEntries` selector       | Task 7    |
| `EventBus` `chapter-cleared`          | Task 8    |
| `useGameSession.onMatchEnded` diff    | Task 8    |
| `eventBridge` subscription            | Task 9    |
| `hudStore.pendingChapterClear`        | Task 9    |
| `ChapterClearedScreen`                | Task 10   |
| `RootNav` route registration          | Task 10   |
| `TowersScreen` 3-state                | Task 11   |
| `ChaptersScreen` mastery icon         | Task 12   |
| Settings Theme row                    | Task 13   |
| HUD palette consumer                  | Task 14   |
| Final verification                    | Task 15   |

All spec sections mapped to a task.

**Type consistency:** `ChapterUnlockState` defined in Task 1 is referenced by `chapterProgress.ts` (Task 5), `loadout.ts` (Tasks 6/7), `useGameSession.ts` (Task 8), `hudStore.ts` (Task 9). `ChapterRewards` defined in Task 3 is referenced by `EventBus.ts` (Task 8), `hudStore.ts` (Task 9), `ChapterClearedScreen` (Task 10), Settings (Task 13). All names match across tasks.

**Placeholder scan:** No "TBD", "implement later", or unspecified type names. Open spec questions resolved inline (firewall stays free, ChapterCleared is a route not a modal, `activePaletteId` undefined-vs-null resolved by `delete d.meta.activePaletteId` for `auto`).
