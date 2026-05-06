# Project Context: tower-gemax (GeMax TD)

## Overview
Cyberpunk netrunner tower defense game built with React Native (Expo SDK 55) and Skia. Repo / package: `tower-gemax`. User-facing product: **GeMax TD**.

## Architecture: Phase-Separated Design
Strict decoupling between simulation, render bridge, and React UI — see `CLAUDE.md` for the load-bearing invariants.

### 1. Headless Engine (Pure TypeScript)
- **Location**: `src/engine/`, `src/world/`, `src/entities/`, `src/content/`, `src/difficulty/`, `src/meta/`, `src/audio/` (synth/bake/specs/wavEncoder/catalog), `src/lib/`.
- **Constraint**: NO React Native or Skia imports allowed. `tsconfig.engine.json` excludes `**/*.tsx`.
- **Tests**: `vitest` (`npm run test:engine`) — ~47 specs, target <2s.
- **Logic**: Seeded RNG (`mulberry32`), deterministic simulation, fixed-timestep accumulator (`FIXED_DT = 1/60s`, max 5 sub-steps per real frame).
- **State**: Mutative classes held in a `World` object built once per match by `createWorld(...)`.

### 2. Rendering Layer (React Native + Skia)
- **Location**: `src/render/`.
- **Graphics**: `@shopify/react-native-skia` for high-performance 2D.
- **Animation**: `react-native-reanimated` v4 (worklets in separate package).
- **Snapshot pattern**: layers (`render/layers/*.tsx`) read a `SharedValue<WorldSnapshot>`, never `world.entities` directly. `RedrawPort.bump()` rebuilds the snapshot at the end of `simStep`. Idle-skip avoids waking worklets between waves.
- **Audio bridge**: `AudioManager.ts` is the single RN seam in `src/audio/` — bakes pure-TS synth output to WAVs in `expo-file-system` cache and plays via pooled `expo-audio` players.

### 3. React UI
- **Location**: `src/app/` (navigation, screens, providers, bootstrap), `src/ui/` (components, modals, HUD store, event bridge).
- **Navigation**: `@react-navigation/native-stack` v7. 10 screens: `Title, Chapters, LevelSelect, Briefing, Play, Towers, Settings, Win, Lose, ChapterCleared`. `PersistentTabBar` is rendered alongside the stack.
- **HUD**: `zustand` v5 (`ui/hudStore.ts`). The engine never touches the store; `attachEventBridge(bus)` (`ui/eventBridge.ts`) translates `lives-changed` / `credits-changed` / `wave-started` / `wave-cleared` / `chapter-cleared` into store mutations.
- **Tests**: `jest-expo` for smoke tests (`__tests__/smoke.test.tsx`, `chapterClearedScreen.smoke.test.tsx`).

## Tech Stack
- **Framework**: Expo SDK 55 (New Architecture default).
- **Language**: TypeScript (`@tsconfig/strictest` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`).
- **Graphics**: `@shopify/react-native-skia@2.4.18`.
- **Animation**: `react-native-reanimated@4.2.1` + `react-native-worklets`.
- **Navigation**: `@react-navigation/native@7` + `native-stack@7`.
- **State**: `zustand@5`.
- **Persistence**: `@react-native-async-storage/async-storage@2.2.0`.
- **Audio**: `expo-audio` + procedural synthesis (pure TS) baked to PCM WAV via `expo-file-system`.
- **Icons / Fonts**: `@expo/vector-icons` (Ionicons / Feather — never emoji glyphs), `@expo-google-fonts/{epilogue,space-grotesk}`.
- **Testing**: `vitest@2.1.8` (engine), `jest@29` + `jest-expo` (RN smoke).

## File Structure Map
- `src/lib/` — math + utilities (vectors, lerp, ids, debounce, types).
- `src/engine/` — core loop, systems (targeting / movement / damage / cleanup), RNG, EventBus, Viewport, ObjectPool.
- `src/world/` — Grid logic, pathfinding, Spawner, WaveDirector, World construction.
- `src/entities/` — Tower, Enemy, Projectile base classes, registry, status effects, ~28 enemies / 15 towers / 11 projectiles.
- `src/content/` — chapters, chapterRewards, levelGenerator (100-mission deterministic generator), enemy/tower/projectile defs, tech nodes (vestigial), boss/cost/survivability curves.
- `src/difficulty/` — DifficultyContext, ramp, selector.
- `src/meta/` — SaveStore (debounced + tmp-key crash safety), schema (v6), migrations chain, chapterProgress, loadout, playerLevel, TechTree (vestigial), asyncStorageKv.
- `src/audio/` — pure-TS synth (`synth.ts`, `specs.ts`, `bake.ts`, `wavEncoder.ts`, `catalog.ts`) + RN seam (`AudioManager.ts`).
- `src/render/` — SkiaWorld, snapshot, useGameSession, useCamera, useWorldGestures, theme, Skia layers (`Background`, `Path`, `GridOverlay`, `Obstacles`, `Spawn`, `Base`, `RangeIndicator`, `Towers`, `Enemies`, `Projectiles`, `FX`).
- `src/ui/` — HUD store, event bridge, components (TowerPanel, TowerPicker, PersistentTabBar, ChapterEmblem, FinalWaveOverlay, Logo, …), modals (PauseModal, NextWaveModal).
- `src/app/` — RootNav, bootstrap, providers (Save, Audio), 10 screens.

## Save Schema (v6)
- `profile { createdAt, lastPlayedAt }`
- `campaign: Record<levelId, { bestStarsByDifficulty, bestWaveReached, cleared, shardsAwardedFor }>`
- `meta { shards, techTree, unlockedTowers, activeLoadout (3 slots, nullable), lastPlayedLevelId?, chapterUnlocks, seenTowers }`
- `settings { audioMaster, sfx, music, difficultyDefault, tutorialSeen, devGodMode? }`
- Migrations: v1→v2 loadout backfill → v3 legacy XP → v4 strip XP → v5 chapterUnlocks → v6 seenTowers. `runMigrations` defensively backfills missing fields on load.

## Development Rules
1. **Determinism**: Never use `Math.random()` or `Date.now()` in the sim. Use `world.rng` and the injected `Clock`.
2. **Fixed Time**: Simulation logic must use the `dt` passed into systems.
3. **Imports**: Use `@/` alias for `src/`. The alias is configured in five places (tsconfig, tsconfig.engine, vitest, jest, babel) — keep them in sync.
4. **Dependencies**: Don't bump the locked Skia / Reanimated / Expo / RN trio without re-validating via `npx expo install --check`. Always install with `--legacy-peer-deps`.
5. **Engine Purity**: Keep `src/engine/`, `src/world/`, `src/entities/`, `src/content/`, `src/difficulty/`, `src/meta/`, `src/lib/` (and synth-side `src/audio/`) free of UI / RN / Skia imports.
6. **Vector icons over emoji**: UI affordances use `@expo/vector-icons`, never glyphs like ▶/⚑/🔒/◆.
7. **Snapshot in, mutation out**: Skia layers read snapshots only; mutations land on `world` from gesture handlers via `runOnJS`.

## Navigation Tips
- **Simulation systems**: `src/engine/systems/` — `targetingSystem`, `movementSystem`, `damageSystem`, `cleanupSystem`. `Engine.ts` orchestrates the simStep order (load-bearing for determinism).
- **Render layers**: `src/render/layers/` — one Skia subtree per layer; `Towers` mounts on `tower-placed`, `Projectiles` reads from the pool snapshot.
- **Game data**: `src/content/levelGenerator.ts` for level shape; `src/content/chapters.ts` for chapter palettes/bosses; `src/content/{tower,enemy,projectile}Defs.ts` for stats.
- **State flow (sim → HUD)**: `EventBus.emit` (buffered) → `bus.flush()` (end of simStep) → listener in `ui/eventBridge.ts` → `useHudStore` setter → HUD component re-render.
- **Save flow**: `SaveProvider` → `useSave()` → `store.update(fn)` (debounced, writes via `tower-gemax/save/v1.tmp` then `tower-gemax/save/v1`) → `refresh()`.
- **Chapter clear flow**: `useGameSession.onMatchEnded` computes `chaptersClearedNewly(before, after)` → `awardChapterClear` → `bus.emit('chapter-cleared', …)` → bridge enqueues on `hudStore` → `PlayScreen` drains and navigates to `ChapterCleared`.
