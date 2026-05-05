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

npm run gen:icons                        # rasterize assets/logo-mark.svg → icon/splash/favicon PNGs
```

Run a single vitest spec: `npx vitest run src/engine/__tests__/Engine.spec.ts` (or `-t "name"` to filter cases).
Run a single jest test: `npx jest src/app/__tests__/smoke.test.tsx -t "title"`.

### Non-negotiable environment

- **Node 22.22.2** via `.nvmrc`. The plan originally specified 20.x but the repo standardized on 22.
- **`--legacy-peer-deps` is mandatory** for any `npm install`. SDK 55 ships React 19, but several transitive packages still declare `react@^18` peers; the flag papers over the warnings without changing the resolved versions.
- **Locked dependency set — do not bump without re-validating together via `npx expo install --check`:** `expo@~55.0.0`, `react-native@0.83.6`, `react@19.2.0`, `@shopify/react-native-skia@2.4.18`, `react-native-reanimated@4.2.1`, `react-native-worklets@>=0.7.0`. Reanimated 4 split worklets into a separate package and the babel plugin moved to `react-native-worklets/plugin` (see `babel.config.js`). Skia/Reanimated/Expo SDK breaks across minor bumps.
- New Architecture is the SDK 55 default — the legacy `newArchEnabled` field has been removed from `app.json`. Native modules must remain Fabric/TurboModules-compatible.

## Architecture

The codebase is split into three layers with a one-way data flow. Understanding the boundary is critical — code on the wrong side breaks tests, perf, or determinism.

### Layer 1 — Pure-TS simulation (vitest, RN-free)

`src/engine/`, `src/world/`, `src/entities/`, `src/content/`, `src/difficulty/`, `src/meta/`, `src/lib/`

These directories are scoped by `tsconfig.engine.json` (which **excludes `**/*.tsx`**) and tested with vitest under a Node environment. **Never import React, RN, Skia, Reanimated, or anything from `src/render`/`src/ui`/`src/app` from these paths** — it will break the engine TS check and the vitest run.

Key invariants:

- **Fixed timestep** (`engine/time.ts`): `FIXED_DT = 1/60`. `Engine.frame(now)` clamps real dt to `MAX_REAL_DT` and drains an accumulator into discrete `simStep(FIXED_DT)` calls (max 5 per real frame). `setSpeed(1|2|3)` multiplies the accumulator, never the dt. The simStep order — wave director → targeting → fire intents → movement → projectiles → damage → chain-on-kill → leaks → bounty → compact pools → win/lose → bus.flush — is load-bearing for determinism.
- **Determinism is a feature, not aspiration.** `SeededRng` (mulberry32, `engine/rng.ts`) is the only randomness source; `engine/__tests__/determinism.spec.ts` enforces this. Don't introduce `Math.random`, `Date.now` (use the injected `Clock`), or untracked iteration order.
- **Object pools** (`engine/pool/ObjectPool.ts`) back projectile spawning. Acquire from `world.pools.{hitscan,ballistic,aoe}`, release in `compactProjectilesAndRelease`. Avoid `new Projectile()` in the hot path.
- **Tech effects are frozen at match start.** `buildEffectsContext(TECH_NODES, save)` (`meta/TechTree.ts`) returns the `EffectsContext` passed into `createWorld`; the engine reads `world.effects.behaviors`/`towerStatMults` during simStep. Don't mutate `EffectsContext` mid-match.
- **Entity classes are looked up via runtime registry.** `bootstrap()` (`app/bootstrap.ts`) populates `entities/registry.ts` with `TowerDef`/`EnemyDef`/`ProjectileDef` — each carries a `classRef`. Spawners and tap-to-place use `getTowerDef(kind).classRef`, never direct imports. Tests that spawn entities must call `bootstrap()` (or register specific defs).

### Layer 2 — Skia rendering bridge

`src/render/`

- `useGameSession.ts` is the seam: it constructs `World` + `Engine` + clock (RAF), wires the SaveStore (for end-of-match persistence) and the AudioManager (for SFX cues from the bus).
- **Renderer reads from a snapshot, not the World.** `RedrawPort.bump()` calls `buildSnapshot(world)` (`render/snapshot.ts`) into a Reanimated `SharedValue<WorldSnapshot>`. Skia layers (`render/layers/*.tsx`) read the snapshot only. To draw something new, add a field to `WorldSnapshot`, populate it in `buildSnapshot`, and consume it in a layer — do not reach into `world.entities` from a layer.
- **`useWorldGestures.ts` runs on the JS thread** via `runOnJS(handleTap)`. Tap-to-place mutates `world` directly (credits, grid occupancy, push tower, emit bus events). Coordinate conversion goes through `Viewport` (`engine/Viewport.ts` — grid ↔ world ↔ screen).

### Layer 3 — React UI

`src/app/` (navigation, screens, providers, bootstrap), `src/ui/` (HUD, modals, components), `src/audio/`

- **HUD state lives in zustand** (`ui/hudStore.ts`). The engine never imports the store. `attachEventBridge(bus)` (`ui/eventBridge.ts`) subscribes to `lives-changed`/`credits-changed`/`wave-*` and pushes into the store. To surface new sim state to the HUD, add an event to `SimEventMap` (`engine/EventBus.ts`), emit it from `simStep`, and bridge it.
- `EventBus.emit` **buffers**; `bus.flush()` at the end of `simStep` drains. Never call `flush()` from inside a listener.
- Providers (`SaveProvider`, `AudioProvider`) are mounted in `App.tsx` and consumed by screens via `useSave()`/`useAudio()`. `bootstrap()` runs once on mount.
- `SaveStore.update(fn)` is a debounced read-modify-write. It always writes through a tmp key (`save/v1.tmp`) before the main key for crash safety. Schema migrations live in `meta/migrations/`.

UI conventions worth knowing:

- **World-anchored overlays use the camera's shared values, not snapshots.** `TowerPanel` and `TowerPicker` are absolutely-positioned RN views that follow a grid cell while the player pans/zooms. Pattern: convert tile → world via `Viewport.gridToWorld`, then drive an `Animated.View` transform via `useAnimatedStyle` reading `camera.zoom.value`/`panX.value`/`panY.value`. Container width/height are passed in for clamping. Don't reach into `world.entities` from the UI thread; selection state comes through `hudStore`/`world.selection`.
- **Stat deltas are shown as percentages, not raw values.** `TowerPanel.StatCell` formats upgrade preview as `+12%` / `-5%` (mint for buff, danger for nerf). When adding a new stat row, follow the same `(next - current) / current` pattern and skip rendering when the delta rounds to 0%.
- **TitleScreen auto-scales to fit the screen height.** All element sizes (title font, stat cards, hero size, gaps) are derived from a single `scale` multiplier computed from the measured body height vs a `REF_HEIGHT` of 720, clamped `[0.6, 1.0]`. Avoid adding fixed pixel sizes to that screen — multiply through `scale` so small devices never need to scroll.

### Brand assets / icons

- `assets/logo-mark.svg` is the source of truth. `npm run gen:icons` (script: `scripts/gen-icons.mjs`, devDep: `sharp`) rasterizes it into `icon.png`, `adaptive-icon.png` (70% safe-zone inset, transparent surround so Android's `adaptiveIcon.backgroundColor` shows through), `splash-icon.png`, `splash.png` (centered on `#0E1014`), and `favicon.png`. Always re-run after touching the SVG; commit the PNGs.
- For in-app rendering of the logo (TitleScreen, splash overlays), use `src/ui/components/Logo.tsx` (Skia) — `<Logo variant="mark|lockup" size={…} animate />`. Don't import the SVG directly.

### Path alias

`@/*` → `src/*` is configured in **four** places and all must agree if you add another resolver: `tsconfig.json`, `tsconfig.engine.json`, `vitest.config.ts`, `jest.config.js` (moduleNameMapper), `babel.config.js` (module-resolver plugin).

### Strict TS settings

`tsconfig.json` extends `@tsconfig/strictest` plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Array indexing returns `T | undefined` — handle it. Optional properties cannot be `undefined`-assigned; either omit the key or include it conditionally (`...(x !== undefined ? { x } : {})`).

## Reference docs

- Design spec: `docs/superpowers/specs/2026-05-04-tower-gemax-design.md` — the source of truth for game-design decisions, tech-tree shape, and architectural rationale.
- Build plan: `docs/superpowers/plans/2026-05-04-tower-gemax-foundation.md` — phased build plan; current status is past Phase A (scaffold) and into rendering/UI work. README's "Phase-A deviations" section captures meaningful drift from the plan.
