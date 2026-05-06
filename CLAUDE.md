# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
nvm use                                  # picks up .nvmrc (22.22.2 — required)
npm install --legacy-peer-deps           # ALWAYS use this flag (see below)
npx expo start                           # Metro + dev menu
npm run ios / npm run android            # native build & run

npm run tsc                              # full project typecheck (App.tsx + src/**)
npm run lint:tsc:engine                  # engine-only typecheck (no .tsx, stricter scope)

npm run test:engine                      # vitest — pure TS sim, target <2s
npm run test:engine:watch                # vitest watch
npm test                                 # jest-expo — RN component smoke

npm run preflight                        # tsc + test:engine + lint:tsc:engine — run before pushing
npm run validate:waves                   # static check on generated wave tables

npm run gen:icons                        # rasterize assets/logo-mark.svg → icon/splash/favicon PNGs

npm run eas:build:dev                    # internal dev build (both platforms)
npm run eas:build:preview:ios            # preview channel iOS
npm run eas:build:preview:android        # preview channel Android
npm run eas:build:prod:ios               # production iOS
npm run eas:build:prod:android           # production Android
npm run eas:build:prod:all               # production both
npm run eas:submit:ios                   # App Store submit
npm run eas:submit:android               # Play Store submit
```

Run a single vitest spec: `npx vitest run src/engine/__tests__/Engine.spec.ts` (or `-t "name"` to filter cases).
Run a single jest test: `npx jest src/app/__tests__/smoke.test.tsx -t "title"`.

### Non-negotiable environment

- **Node 22.22.2** via `.nvmrc`. The plan originally specified 20.x but the repo standardized on 22.
- **`--legacy-peer-deps` is mandatory** for any `npm install`. SDK 55 ships React 19, but several transitive packages still declare `react@^18` peers; the flag papers over the warnings without changing the resolved versions.
- **Locked dependency set — do not bump without re-validating together via `npx expo install --check`:** `expo@~55.0.0`, `react-native@0.83.6`, `react@19.2.0`, `@shopify/react-native-skia@2.4.18`, `react-native-reanimated@4.2.1`, `react-native-worklets@>=0.7.0`. Reanimated 4 split worklets into a separate package and the babel plugin moved to `react-native-worklets/plugin` (see `babel.config.js`). Skia/Reanimated/Expo SDK breaks across minor bumps.
- **Other load-bearing deps** (don't swap casually): `@react-navigation/native@7` + `native-stack@7` (route shapes typed in `app/RootNav.tsx`), `expo-audio` (pooled players power the AudioManager), `expo-file-system` (procedural audio bakes WAVs to cache dir), `zustand@5` (HUD store), `@react-native-async-storage/async-storage@2.2.0` (SaveStore backing), `@expo/vector-icons` (Ionicons/Feather — see icon-vs-emoji rule below), `@expo-google-fonts/{epilogue,space-grotesk}` (loaded in `App.tsx` before nav mounts).
- New Architecture is the SDK 55 default — the legacy `newArchEnabled` field has been removed from `app.json`. Native modules must remain Fabric/TurboModules-compatible.

## Architecture

The codebase is split into three layers with a one-way data flow. Understanding the boundary is critical — code on the wrong side breaks tests, perf, or determinism.

### Layer 1 — Pure-TS simulation (vitest, RN-free)

`src/engine/`, `src/world/`, `src/entities/`, `src/content/`, `src/difficulty/`, `src/meta/`, `src/audio/` (synth/bake/specs/wavEncoder/catalog only — `AudioManager.ts` is the RN seam), `src/lib/`

These directories are scoped by `tsconfig.engine.json` (which **excludes `**/*.tsx`**) and tested with vitest under a Node environment. **Never import React, RN, Skia, Reanimated, or anything from `src/render`/`src/ui`/`src/app` from these paths** — it will break the engine TS check and the vitest run.

Key invariants:

- **Fixed timestep** (`engine/time.ts`): `FIXED_DT = 1/60`. `Engine.frame(now)` clamps real dt to `MAX_REAL_DT` and drains an accumulator into discrete `simStep(FIXED_DT)` calls (max 5 per real frame). `setSpeed(1|2|3)` multiplies the accumulator, never the dt. The simStep order — wave director → targeting → fire intents → movement → projectiles → damage → chain-on-kill → leaks → bounty → compact pools → win/lose → bus.flush — is load-bearing for determinism.
- **Determinism is a feature, not aspiration.** `SeededRng` (mulberry32, `engine/rng.ts`) is the only randomness source; `engine/__tests__/determinism.spec.ts` enforces this. Don't introduce `Math.random`, `Date.now` (use the injected `Clock`), or untracked iteration order.
- **Object pools** (`engine/pool/ObjectPool.ts`) back projectile spawning. Acquire from `world.pools.{hitscan,ballistic,aoe}`, release in `compactProjectilesAndRelease`. Avoid `new Projectile()` in the hot path.
- **EffectsContext is frozen at match start.** `buildEffectsContext(save.meta.techTree)` (`meta/TechTree.ts`) returns the `EffectsContext` passed into `createWorld`; the engine reads `world.effects.behaviors`/`towerStatMults`/`globals` during simStep. Don't mutate `EffectsContext` mid-match. The TechTree subsystem is currently vestigial — there is no UI surface for tier upgrades after the chapter-progression rework — but the plumbing is intact and `meta/TechTree.ts` still suppresses superseded tiers along the requires chain.
- **Entity classes are looked up via runtime registry.** `bootstrap()` (`app/bootstrap.ts`) populates `entities/registry.ts` with `TowerDef`/`EnemyDef`/`ProjectileDef` — each carries a `classRef`. Spawners and tap-to-place use `getTowerDef(kind).classRef`, never direct imports. Tests that spawn entities must call `bootstrap()` (or register specific defs).
- **Levels are generated, not authored.** `src/content/levelGenerator.ts:generateAllLevels()` builds the entire 100-mission catalog (10 chapters × 10 missions, IDs `lvl-cN-mM`) deterministically from `(chapter, mission)` seeds. `src/content/levels/index.ts` is a thin re-export — edits go in the generator. Path uniqueness inside a chapter is enforced via fingerprint with `MAX_PATH_RETRIES=64`. Lane count, bend range, dims, obstacles (`crate`/`rocket`/`void` from chapter 3+), enemy tiers, and the chapter boss are all derived from `(chapterIdx, missionIdx)`.
- **Bestiary / roster scale.** ~28 enemies (`src/entities/enemies/`), 15 towers (`src/entities/towers/`), 11 projectile classes (`src/entities/projectiles/`). All registered through `bootstrap()`.

### Layer 2 — Skia rendering bridge

`src/render/`

- `useGameSession.ts` is the seam: it constructs `World` + `Engine` + clock (RAF), wires the SaveStore (for end-of-match persistence + chapter-clear award) and the AudioManager (for SFX cues from the bus, including coalesced `enemy-died` and deferred `tower-placed`).
- **Renderer reads from a snapshot, not the World.** `RedrawPort.bump()` calls `buildSnapshot(world)` (`render/snapshot.ts`) into a Reanimated `SharedValue<WorldSnapshot>`. Skia layers (`render/layers/*.tsx` — `Background`, `Path`, `GridOverlay`, `Obstacles`, `Spawn`, `Base`, `RangeIndicator`, `Towers`, `Enemies`, `Projectiles`, `FX`) read the snapshot only. To draw something new, add a field to `WorldSnapshot`, populate it in `buildSnapshot`, and consume it in a layer — do not reach into `world.entities` from a layer.
- **Idle skip:** `useGameSession.ts` short-circuits `snapshot.value =` writes when both enemy and projectile arrays are empty (and were last frame). This avoids waking every layer's `useDerivedValue` worklet during pre-wave / post-wave idle.
- **`useWorldGestures.ts` runs on the JS thread** via `runOnJS(handleTap)`. Tap-to-place mutates `world` directly (credits, grid occupancy, push tower, emit bus events). Coordinate conversion goes through `Viewport` (`engine/Viewport.ts` — grid ↔ world ↔ screen).

### Layer 3 — React UI

`src/app/` (navigation, screens, providers, bootstrap), `src/ui/` (HUD, modals, components)

**Screens (registered in `app/RootNav.tsx`):** `Title`, `Chapters`, `LevelSelect` (params: `{ chapter }`), `Briefing` (params: `{ levelId, difficulty }`), `Towers`, `Settings`, `Play`, `Win`, `Lose`, `ChapterCleared` (interstitial between Play and Win when a clear-diff fires). All `headerShown: false`, `animation: 'none'`. `Title`, `Towers`, `Settings` block back-navigation. A `PersistentTabBar` is rendered alongside the stack and reacts to the active route.

**HUD state lives in zustand** (`ui/hudStore.ts`). The engine never imports the store. `attachEventBridge(bus)` (`ui/eventBridge.ts`) currently subscribes to:
- `lives-changed` → `setLives`
- `credits-changed` → `setCredits`
- `wave-started` / `wave-cleared` → `setWave`
- `chapter-cleared` → `enqueueChapterClear` (drained by `PlayScreen` after match end to navigate to `ChapterClearedScreen`)

To surface new sim state, add an event to `SimEventMap` (`engine/EventBus.ts`), emit it from `simStep`, and bridge it.

- `EventBus.emit` **buffers**; `bus.flush()` at the end of `simStep` drains. Never call `flush()` from inside a listener.
- Providers (`SaveProvider`, `AudioProvider`) are mounted in `App.tsx` and consumed by screens via `useSave()`/`useAudio()`. `bootstrap()` runs once on mount.
- `SaveStore.update(fn)` is a debounced read-modify-write. It always writes through a tmp key (`tower-gemax/save/v1.tmp`) before the main key (`tower-gemax/save/v1`) for crash safety. Schema migrations live in `meta/migrations/`.

### Save schema, loadout, chapter progression (meta layer)

`src/meta/schema.ts` — current version: **`CURRENT_VERSION = 6`**, `SaveDataLatest = SaveDataV6`. Shape:

- `profile { createdAt, lastPlayedAt }`
- `campaign: Record<levelId, LevelProgress>` — `LevelProgress = { bestStarsByDifficulty, bestWaveReached, cleared, shardsAwardedFor }`
- `meta`:
  - `shards: number`
  - `techTree: Record<nodeId, tier>` (vestigial, retained for future re-enablement)
  - `unlockedTowers: TowerKind[]` — purchased + starter towers (starters: `DEFAULT_UNLOCKED_TOWERS = ['bullet-turret','logic-bomb']`)
  - `activeLoadout: (TowerKind|null)[]` — fixed length `LOADOUT_SLOTS = 3`. Nulls are reserved empty slots that don't shift left when a tower is removed.
  - `lastPlayedLevelId?` — drives Title's CONTINUE affordance
  - `chapterUnlocks: Record<chapterIdx, { rewardClaimedAt? }>` — presence + `rewardClaimedAt` means clear celebrated; absence means it's still pending
  - `seenTowers: TowerKind[]` — what the player has acknowledged on the Towers screen; drives the "new tower" badge on the Towers tab
- `settings { audioMaster, sfx, music, difficultyDefault, tutorialSeen, devGodMode? }`

**Migration chain** (`src/meta/migrations/index.ts`): v1→v2 (loadout backfill) → v3 (legacy XP) → v4 (strip XP) → v5 (chapterUnlocks backdate from cleared chapters) → v6 (seenTowers seeded from currently-visible towers). `runMigrations` also defensively backfills `chapterUnlocks` and `seenTowers` if absent on load. **When adding a migration:** bump `CURRENT_VERSION`, add `SaveDataVN` + `PersistedBlobVN` + `blankSaveDataVN` types, append the step to the chain, add a spec in `meta/migrations/__tests__/migrations.spec.ts`, and update `SaveDataLatest`/`PersistedBlobLatest`/`blankSaveDataLatest` aliases.

**Chapter progression** (`src/meta/chapterProgress.ts`, `src/meta/loadout.ts`, `src/content/chapters.ts`, `src/content/chapterRewards.ts`):

- 10 chapters (Intranet, Uplink, Cloud Layer, Mainframe, Firmware, Darknet, Quantum, Logic, Void, Apex), each with `paletteAccent` + `paletteSecondary`, `bossEnemyKind`, `briefing`, `finaleLevelId='lvl-cN-m9'`.
- Chapter "cleared" = all 10 of its missions have `cleared: true` on Normal difficulty.
- `chaptersClearedNewly(before, after)` returns chapter indices whose state flipped during a save update; `awardChapterClear(d, ch)` records the unlock; `useGameSession` emits `bus.emit('chapter-cleared', ...)` after the SaveStore update commits.
- Tower store is three-state via `getTowerStoreEntries`: `owned` | `buyable` | `chapter-locked` (with `LOCKED · CH XX` label using zero-padded display). Unlocked towers sort first, then by gating chapter.
- `markTowerSeen` / `hasUnseenTowers` / `visibleTowerKinds` drive the badge on the Towers tab.

### Audio

`src/audio/` is split: pure-TS synthesis (engine layer, vitest-tested) plus a thin RN seam.

- **Pure TS:** `synth.ts` (oscillators, ADSR, noise, lowpass, mix, gain — seeded mulberry32), `specs.ts` (per-key timbre params), `bake.ts` (renders specs into Float32 buffers), `wavEncoder.ts` (Float32 → 16-bit PCM WAV), `catalog.ts` (`SFX_KEYS`, `SFX_POOL_SIZE`, `MusicKey`).
- **RN seam:** `AudioManager.ts` writes baked WAVs to `expo-file-system` cache on first use, then plays via pooled `expo-audio` `AudioPlayer`s. Round-robin pools per SFX key prevent stomping when same-kind shots fire concurrently. Optional pitch jitter on per-tower fire SFX. Music keys: `main-menu`, `in-game` — `RootNav` plays `main-menu` whenever the active route changes; `PlayScreen` swaps to `in-game` only while a wave is actively running.
- 22 SFX keys (one per tower fire + `enemy-hit/death`, `wave-start`, `life-lost`, `win`, `lose`, `ui-click`, `tower-placed`).

### UI conventions worth knowing

- **Vector icons over emoji.** UI affordances use `@expo/vector-icons` (Ionicons/Feather) — never emoji glyphs (▶/⚑/🔒/◆).
- **World-anchored overlays use the camera's shared values, not snapshots.** `TowerPanel` and `TowerPicker` are absolutely-positioned RN views that follow a grid cell while the player pans/zooms. Pattern: convert tile → world via `Viewport.gridToWorld`, then drive an `Animated.View` transform via `useAnimatedStyle` reading `camera.zoom.value`/`panX.value`/`panY.value`. Container width/height are passed in for clamping. Don't reach into `world.entities` from the UI thread; selection state comes through `hudStore`/`world.selection`.
- **Stat deltas are shown as percentages, not raw values.** `TowerPanel.StatCell` formats upgrade preview as `+12%` / `-5%` (mint for buff, danger for nerf). When adding a new stat row, follow the same `(next - current) / current` pattern and skip rendering when the delta rounds to 0%.
- **TitleScreen auto-scales to fit the screen height.** All element sizes (title font, stat cards, hero size, gaps) are derived from a single `scale` multiplier computed from the measured body height vs a `REF_HEIGHT` of 720, clamped `[0.6, 1.0]`. Avoid adding fixed pixel sizes to that screen — multiply through `scale` so small devices never need to scroll.
- **Two-tap sell** on `TowerPanel`: first tap reveals the refund value, second tap commits. Disabled-style upgrade button when the player can't afford the next tier.
- **Settings dev flag** (`__DEV__`-gated): GOD MODE toggle. ON sets `meta.shards = 999_999` and seeds `world.credits = 200_000` at next match start (see `useGameSession.ts`). OFF performs a full reset (`campaign={}`, `shards=0`, `chapterUnlocks={}`, `unlockedTowers→starters`, `loadout→default`, `seenTowers=[]`, drops `lastPlayedLevelId`); audio + tutorialSeen are preserved. `ChaptersScreen`/`LevelSelectScreen` honor the flag to unlock everything when `__DEV__ && devGodMode`.

### Brand assets / icons

- `assets/logo-mark.svg` is the source of truth. `npm run gen:icons` (script: `scripts/gen-icons.mjs`, devDep: `sharp`) rasterizes it into `icon.png`, `adaptive-icon.png` (70% safe-zone inset, transparent surround so Android's `adaptiveIcon.backgroundColor` shows through), `splash-icon.png`, `splash.png` (centered on `#0E1014`), and `favicon.png`. Always re-run after touching the SVG; commit the PNGs.
- For in-app rendering of the logo (TitleScreen, splash overlays), use `src/ui/components/Logo.tsx` (Skia) — `<Logo variant="mark|lockup" size={…} animate />`. Don't import the SVG directly.

### Path alias

`@/*` → `src/*` is configured in **five** places and all must agree if you add another resolver: `tsconfig.json`, `tsconfig.engine.json`, `vitest.config.ts`, `jest.config.js` (moduleNameMapper), `babel.config.js` (module-resolver plugin).

### Strict TS settings

`tsconfig.json` extends `@tsconfig/strictest` plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Array indexing returns `T | undefined` — handle it. Optional properties cannot be `undefined`-assigned; either omit the key or include it conditionally (`...(x !== undefined ? { x } : {})`).

## Reference docs

- Original design spec: `docs/superpowers/specs/2026-05-04-tower-gemax-design.md` — game-design baseline, tech-tree shape (now mostly historical), architectural rationale.
- Original build plan: `docs/superpowers/plans/2026-05-04-tower-gemax-foundation.md` — phased build plan; the codebase is well past Phase A and into rendering/UI/meta work.
- Procedural SFX: `docs/superpowers/specs/2026-05-04-procedural-sfx-design.md` + `plans/2026-05-04-procedural-sfx.md` — pure-TS synth → WAV bake → expo-audio pipeline.
- Chapter progression: `docs/superpowers/specs/2026-05-06-chapter-progression-design.md` + `plans/2026-05-06-chapter-progression.md` — chapter-clear gates, mastery medals, per-chapter palettes, three-state tower store.
