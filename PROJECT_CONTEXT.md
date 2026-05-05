# Project Context: tower-gemax

## Overview
Cyberpunk netrunner tower defense game built with React Native (Expo) and Skia.

## Architecture: Phase-Separated Design
The project follows a strict decoupling between the game simulation and the rendering layer.

### 1. Headless Engine (Pure TypeScript)
- **Location**: `src/engine/`, `src/world/`, `src/entities/`, `src/lib/`.
- **Constraint**: NO React Native or Skia imports allowed.
- **Tests**: Tested via `vitest` (`npm run test:engine`).
- **Logic**: Seeded RNG (`mulberry32`), deterministic simulation, fixed-timestep accumulator (`1/60s`).
- **State**: Mutative classes held in a `World` object.

### 2. Rendering Layer (React Native + Skia)
- **Location**: `src/render/`, `src/ui/`, `src/app/`, `src/audio/`.
- **Graphics**: `react-native-skia` for high-performance 2D.
- **Animation**: `react-native-reanimated` (Redraw tick driven).
- **HUD**: `zustand` for reactive UI state.
- **Tests**: `jest-expo` for smoke tests.

## Tech Stack
- **Framework**: Expo (SDK 52).
- **Language**: TypeScript (Strict mode).
- **Graphics**: @shopify/react-native-skia.
- **Animation**: react-native-reanimated.
- **State**: zustand.
- **Persistence**: @react-native-async-storage/async-storage.
- **Audio**: expo-audio (Procedural synthesis).

## File Structure Map
- `src/lib`: General math and utility (vectors, lerp, ids).
- `src/engine`: Core loop, systems (targeting, movement, damage), RNG, EventBus.
- `src/world`: Grid logic, pathfinding, spawning.
- `src/entities`: Tower, Enemy, and Projectile base classes and definitions.
- `src/content`: Game data (level layouts, wave definitions, tech tree nodes).
- `src/render`: Skia layers and rendering hooks.
- `src/ui`: React components for HUD and modals.
- `src/app`: Navigation and providers.

## Development Rules
1. **Determinism**: Never use `Math.random()`. Use `world.rng`.
2. **Fixed Time**: Simulation logic must use the `dt` passed into systems.
3. **Imports**: Use `@/` alias for `src/`.
4. **Dependencies**: Use exact versions in `package.json`.
5. **Engine Purity**: Keep `src/engine` and `src/world` free of UI/Rendering logic.

## Navigation Tips
- **Simulation Logic**: Look in `src/engine/systems/` for how damage/movement works.
- **Graphics/Layers**: Look in `src/render/layers/` for Skia drawing code.
- **Game Data**: Look in `src/content/` for tower/enemy stats and levels.
- **State Flow**: Engine events (`EventBus`) -> `ui/eventBridge.ts` -> `ui/hudStore.ts` -> HUD Components.