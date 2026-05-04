# tower-gemax Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable vertical slice of a cyberpunk netrunner tower defense game — full level 1 (3 towers, 4 enemies, 10 waves), difficulty selector, persistent shards + tech tree, deterministic engine, 60 fps on mid-tier Android.

**Architecture:** Class-based entities mutating in place inside a `useRef`-held `World`. Fixed-timestep accumulator on the JS thread. Read/write phase separation per tick keeps determinism. Skia layers redraw via a Reanimated `redrawTick` shared value. RN-free engine code lives under `src/{engine,world,entities,content,difficulty,meta,lib}` and runs in vitest. RN code lives under `src/{app,render,audio,ui}`.

**Tech Stack:** Expo (managed) · TypeScript · React Native 0.74+ · `react-native-skia` · `react-native-reanimated` 3 · `react-native-gesture-handler` · `@react-native-async-storage/async-storage` · `expo-audio` · `expo-font` · `zustand` · vitest (engine) · jest-expo (RN smoke).

**Spec:** [`docs/superpowers/specs/2026-05-04-tower-gemax-design.md`](../specs/2026-05-04-tower-gemax-design.md)

---

## Prerequisites

The plan assumes:

1. **Node.js 20+ on PATH.** Install via `nvm` or Homebrew. Verify: `node -v` prints v20+.
2. **Expo CLI** is invoked via `npx expo …` (no global install required).
3. **iOS Simulator** (Xcode) and/or **Android Emulator** (Android Studio) installed for device-style verification. Expo Go on a physical phone also works.
4. **Git** is available; the plan uses frequent small commits as review checkpoints.

If git has not been initialized, Task A0 covers it.

---

## File Structure

This is the full target tree. Tasks below will create these files. Each file has one focused responsibility.

```
tower-gemax/
├── .gitignore
├── .nvmrc
├── app.json                          # Expo config (portrait lock, splash, dark)
├── babel.config.js                   # Reanimated plugin LAST
├── metro.config.js                   # default Expo
├── package.json                      # exact-pinned deps
├── tsconfig.json                     # RN app TS config
├── tsconfig.engine.json              # RN-free engine TS config (extends root)
├── vitest.config.ts                  # engine tests
├── jest.config.js                    # RN smoke (jest-expo preset)
├── App.tsx                           # Expo entry; calls bootstrap, renders <RootNav>
├── index.ts                          # registerRootComponent(App)
├── src/
│   ├── lib/
│   │   ├── vec2.ts                   # plain vector math
│   │   ├── lerp.ts                   # lerp, clamp, smoothstep
│   │   ├── assert.ts                 # invariant() + dev-only assert
│   │   ├── debounce.ts               # trailing debounce
│   │   ├── id.ts                     # makeId(prefix) — monotonic + counter
│   │   ├── types.ts                  # shared utility types (Brand, DeepReadonly, etc.)
│   │   └── __tests__/                # *.spec.ts
│   ├── engine/
│   │   ├── rng.ts                    # SeededRng (mulberry32)
│   │   ├── EventBus.ts               # typed pub/sub
│   │   ├── pool/ObjectPool.ts        # acquire/release pool
│   │   ├── Viewport.ts               # world↔grid↔screen conversions
│   │   ├── time.ts                   # FIXED_DT, accumulator helpers
│   │   ├── Engine.ts                 # RAF loop + AppState (RN-light import behind flag)
│   │   ├── systems/
│   │   │   ├── targetingSystem.ts
│   │   │   ├── movementSystem.ts
│   │   │   ├── damageSystem.ts
│   │   │   └── cleanupSystem.ts
│   │   └── __tests__/
│   ├── world/
│   │   ├── Path.ts                   # PathPolyline + distAlongPath ↔ xy
│   │   ├── Grid.ts                   # BuildGrid, tile validity
│   │   ├── World.ts                  # type World + factory createWorld(level, ...)
│   │   ├── Spawner.ts
│   │   ├── WaveDirector.ts
│   │   └── __tests__/
│   ├── entities/
│   │   ├── Entity.ts                 # base
│   │   ├── Tower.ts                  # base + getStat hook
│   │   ├── towers/
│   │   │   ├── FirewallTower.ts
│   │   │   ├── LogicBombTower.ts
│   │   │   └── ICELanceTower.ts
│   │   ├── Enemy.ts                  # base + status logic
│   │   ├── enemies/
│   │   │   ├── WormEnemy.ts
│   │   │   ├── TrojanEnemy.ts
│   │   │   ├── DaemonEnemy.ts
│   │   │   └── RootkitEnemy.ts
│   │   ├── Projectile.ts             # base
│   │   ├── projectiles/
│   │   │   ├── HitscanProjectile.ts
│   │   │   ├── BallisticProjectile.ts
│   │   │   └── AoEPulseProjectile.ts
│   │   ├── StatusEffect.ts
│   │   ├── getStat.ts                # central stat resolver
│   │   ├── registry.ts               # registerTowers / registerEnemies / registerProjectiles
│   │   └── __tests__/
│   ├── content/
│   │   ├── towerDefs.ts              # FIREWALL, LOGIC_BOMB, ICE_LANCE
│   │   ├── enemyDefs.ts              # WORM, TROJAN, DAEMON, ROOTKIT
│   │   ├── projectileDefs.ts         # HITSCAN_BOLT, BALLISTIC_PULSE, AOE_PULSE
│   │   ├── techNodes.ts              # TECH_NODES (9 nodes)
│   │   ├── levels/
│   │   │   ├── lvl-01-intranet.ts    # full level 1
│   │   │   └── stubs.ts              # placeholders for chapter math
│   │   └── __tests__/
│   ├── difficulty/
│   │   ├── selector.ts               # SELECTOR_MULTS
│   │   ├── ramp.ts                   # chapterMultipliers(chapterIndex)
│   │   ├── DifficultyContext.ts      # createDifficultyContext()
│   │   └── __tests__/
│   ├── meta/
│   │   ├── SaveStore.ts              # AsyncStorage facade
│   │   ├── schema.ts                 # SaveDataV1 type + initial blank
│   │   ├── migrations/
│   │   │   ├── index.ts              # MIGRATIONS array + runMigrations()
│   │   │   └── __tests__/
│   │   ├── TechTree.ts               # unlock evaluation, EffectsContext builder
│   │   └── __tests__/
│   ├── audio/
│   │   ├── AudioManager.ts           # expo-audio pool
│   │   ├── catalog.ts                # SFX_KEYS, MUSIC_KEYS → require() refs
│   │   └── assets/                   # placeholder mp3/m4a
│   ├── render/
│   │   ├── theme.ts                  # palette tokens, fonts
│   │   ├── shaders/
│   │   │   ├── scanline.ts           # Skia SkSL string
│   │   │   └── chromatic.ts
│   │   ├── SkiaWorld.tsx             # the <Canvas>, layer composition
│   │   └── layers/
│   │       ├── BackgroundLayer.tsx
│   │       ├── PathLayer.tsx
│   │       ├── GridOverlayLayer.tsx
│   │       ├── TowersLayer.tsx
│   │       ├── EnemiesLayer.tsx
│   │       ├── ProjectilesLayer.tsx
│   │       ├── FXLayer.tsx
│   │       └── RangeIndicatorLayer.tsx
│   ├── ui/
│   │   ├── hudStore.ts               # zustand HUD slice
│   │   ├── eventBridge.ts            # EventBus → hudStore subscriber
│   │   ├── components/
│   │   │   ├── HUDTop.tsx            # lives, wave, credits, pause, speed
│   │   │   ├── HUDBottom.tsx         # tower buy bar
│   │   │   ├── TowerPanel.tsx        # selected-tower side panel
│   │   │   ├── WavePreview.tsx
│   │   │   └── DifficultyPills.tsx
│   │   └── modals/
│   │       ├── PauseModal.tsx
│   │       ├── WinModal.tsx
│   │       ├── LoseModal.tsx
│   │       └── SettingsModal.tsx
│   └── app/
│       ├── bootstrap.ts              # registers catalogs, init audio
│       ├── RootNav.tsx               # native-stack navigator
│       ├── providers/
│       │   ├── SaveProvider.tsx      # loads save into context
│       │   └── AudioProvider.tsx
│       └── screens/
│           ├── TitleScreen.tsx
│           ├── LevelSelectScreen.tsx
│           ├── TechTreeScreen.tsx
│           └── PlayScreen.tsx        # hosts SkiaWorld + HUD
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-05-04-tower-gemax-design.md
        └── plans/
            └── 2026-05-04-tower-gemax-foundation.md  ← this file
```

---

## Conventions used in this plan

- **Test runner:**
  - Pure TS (engine, world, entities, content, difficulty, meta, lib): **vitest**.
  - RN code (app, render, ui, audio): **jest-expo** preset, smoke-only.
  - Run engine tests with `npm run test:engine`. Run RN tests with `npm test`.
- **Commits:** every task ends with a commit. Commit messages use Conventional Commits (`feat:`, `chore:`, `test:`, `fix:`).
- **Code style:** TypeScript strict mode, no `any`. Imports use `@/…` alias to `src/`.
- **Pinning:** every dep in `package.json` uses an exact version (no caret). Tasks specify the exact versions to install.
- **No console.log in committed code** — use `if (__DEV__) console.warn(…)` for diagnostics that must remain.

---

## Phase A — Project Scaffold

End-of-phase checkpoint: app boots to a blank screen on iOS + Android, vitest runs and passes one trivial test, jest-expo runs and passes one trivial test, repo is committed.

### Task A0: Initialize git repository

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Initialize repo and configure ignore patterns**

```bash
cd /Users/renan/projects/tower-gemax
git init
```

- [ ] **Step 2: Write `.gitignore`**

Create `/Users/renan/projects/tower-gemax/.gitignore`:

```gitignore
# Node
node_modules/
npm-debug.log*
yarn-error.log*

# Expo / RN
.expo/
.expo-shared/
dist/
web-build/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*

# Metro
.metro-cache/

# Native
ios/Pods/
ios/build/
android/.gradle/
android/build/
android/app/build/

# Env
.env
.env.local
.env.*.local

# OS
.DS_Store
Thumbs.db

# Editors
.vscode/
.idea/

# Test
coverage/

# Superpowers brainstorm (visual companion artifacts)
.superpowers/
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: initialize git repo with gitignore"
```

### Task A1: Create Expo TypeScript scaffold

**Files:**
- Create: `package.json`, `App.tsx`, `index.ts`, `app.json`, `babel.config.js`, `metro.config.js`, `tsconfig.json`, `.nvmrc`

- [ ] **Step 1: Pin Node version**

Create `/Users/renan/projects/tower-gemax/.nvmrc`:

```
20.11.1
```

- [ ] **Step 2: Initialize Expo blank-typescript template**

Run from project root (this writes a baseline `package.json`, `App.tsx`, `index.ts`, `app.json`, `babel.config.js`, `tsconfig.json`):

```bash
npx create-expo-app@latest . --template blank-typescript --no-install
```

If `create-expo-app` complains about a non-empty directory, pass `--yes` and confirm; the `.gitignore` and `.nvmrc` should be left untouched.

- [ ] **Step 3: Replace `app.json` with portrait-locked config**

Overwrite `/Users/renan/projects/tower-gemax/app.json`:

```json
{
  "expo": {
    "name": "tower-gemax",
    "slug": "tower-gemax",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0A0E1A"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "online.gemax.tower",
      "infoPlist": {
        "UIBackgroundModes": []
      }
    },
    "android": {
      "package": "online.gemax.tower",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0A0E1A"
      }
    },
    "assetBundlePatterns": ["**/*"],
    "newArchEnabled": true
  }
}
```

- [ ] **Step 4: Install exact-pinned core dependencies**

```bash
npm install --save-exact \
  expo@52.0.11 \
  react@18.3.1 \
  react-native@0.76.3 \
  react-native-gesture-handler@2.20.2 \
  react-native-reanimated@3.16.7 \
  react-native-screens@4.4.0 \
  react-native-safe-area-context@4.12.0 \
  @react-navigation/native@7.0.14 \
  @react-navigation/native-stack@7.2.0 \
  @react-native-async-storage/async-storage@2.1.0 \
  @shopify/react-native-skia@1.5.10 \
  expo-audio@0.3.5 \
  expo-font@13.0.3 \
  expo-status-bar@2.0.0 \
  zustand@5.0.2
```

> If a version above is no longer compatible with the latest Expo SDK at install time, prefer the version Expo's `npx expo install --check` recommends. Document the working triple in `README.md` (Task A6).

- [ ] **Step 5: Install exact-pinned dev dependencies**

```bash
npm install --save-exact --save-dev \
  typescript@5.3.3 \
  @types/react@18.3.12 \
  vitest@2.1.8 \
  @vitest/ui@2.1.8 \
  jest@29.7.0 \
  jest-expo@52.0.2 \
  @types/jest@29.5.14 \
  @testing-library/react-native@12.9.0 \
  ts-node@10.9.2 \
  @tsconfig/strictest@2.0.5
```

- [ ] **Step 6: Replace `babel.config.js` (Reanimated plugin must be last)**

Overwrite `/Users/renan/projects/tower-gemax/babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', { alias: { '@': './src' } }],
      'react-native-reanimated/plugin',
    ],
  };
};
```

Install the resolver:

```bash
npm install --save-exact --save-dev babel-plugin-module-resolver@5.0.2
```

- [ ] **Step 7: Replace `tsconfig.json` with strict config + alias**

Overwrite `/Users/renan/projects/tower-gemax/tsconfig.json`:

```json
{
  "extends": ["@tsconfig/strictest/tsconfig.json", "expo/tsconfig.base"],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "jsx": "react-native",
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "moduleResolution": "bundler"
  },
  "include": ["App.tsx", "index.ts", "src/**/*"]
}
```

- [ ] **Step 8: Add npm scripts to `package.json`**

Edit `package.json` so the `"scripts"` block reads:

```json
"scripts": {
  "start": "expo start",
  "ios": "expo start --ios",
  "android": "expo start --android",
  "tsc": "tsc --noEmit",
  "test": "jest",
  "test:engine": "vitest run --config vitest.config.ts",
  "test:engine:watch": "vitest --config vitest.config.ts",
  "lint:tsc:engine": "tsc --noEmit -p tsconfig.engine.json"
}
```

- [ ] **Step 9: Commit**

```bash
git add .nvmrc package.json package-lock.json App.tsx index.ts app.json babel.config.js tsconfig.json metro.config.js assets/
git commit -m "chore: scaffold expo + ts + reanimated + skia"
```

### Task A2: Add `tsconfig.engine.json` + vitest config

**Files:**
- Create: `tsconfig.engine.json`, `vitest.config.ts`

- [ ] **Step 1: Create `tsconfig.engine.json`**

Create `/Users/renan/projects/tower-gemax/tsconfig.engine.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "target": "ES2022",
    "jsx": "preserve",
    "moduleResolution": "bundler",
    "types": ["node", "vitest/globals"]
  },
  "include": [
    "src/lib/**/*",
    "src/engine/**/*",
    "src/world/**/*",
    "src/entities/**/*",
    "src/content/**/*",
    "src/difficulty/**/*",
    "src/meta/**/*"
  ],
  "exclude": ["**/*.tsx"]
}
```

- [ ] **Step 2: Create `vitest.config.ts`**

Create `/Users/renan/projects/tower-gemax/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: [
      'src/lib/**/*.spec.ts',
      'src/engine/**/*.spec.ts',
      'src/world/**/*.spec.ts',
      'src/entities/**/*.spec.ts',
      'src/content/**/*.spec.ts',
      'src/difficulty/**/*.spec.ts',
      'src/meta/**/*.spec.ts',
    ],
    globals: true,
    environment: 'node',
    reporters: process.env['CI'] ? ['default'] : ['default'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

- [ ] **Step 3: Add a smoke spec to verify vitest runs**

Create `/Users/renan/projects/tower-gemax/src/lib/__tests__/smoke.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('vitest smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run the engine test suite**

```bash
npm run test:engine
```

Expected: `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add tsconfig.engine.json vitest.config.ts src/lib/__tests__/smoke.spec.ts
git commit -m "chore: configure vitest for engine code"
```

### Task A3: Configure jest-expo for RN smoke tests

**Files:**
- Create: `jest.config.js`, `jest.setup.ts`

- [ ] **Step 1: Create `jest.config.js`**

Create `/Users/renan/projects/tower-gemax/jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: ['<rootDir>/jest.setup.ts'],
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx)',
    '**/*.test.(ts|tsx)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo|@expo-google-fonts|react-clone-referenced-element|@react-native-community|@react-navigation|@shopify/react-native-skia|react-native-reanimated|react-native-gesture-handler)',
  ],
};
```

- [ ] **Step 2: Create `jest.setup.ts`**

Create `/Users/renan/projects/tower-gemax/jest.setup.ts`:

```ts
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);
```

- [ ] **Step 3: Add a smoke RN test**

Create `/Users/renan/projects/tower-gemax/src/app/__tests__/smoke.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

describe('jest smoke', () => {
  it('renders Text', () => {
    const { getByText } = render(<Text>hello</Text>);
    expect(getByText('hello')).toBeTruthy();
  });
});
```

- [ ] **Step 4: Run the jest suite**

```bash
npm test
```

Expected: `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add jest.config.js jest.setup.ts src/app/__tests__/smoke.test.tsx
git commit -m "chore: configure jest-expo for RN smoke tests"
```

### Task A4: Create empty folder skeleton with placeholder index files

**Files:**
- Create: `src/{lib,engine,world,entities,content,difficulty,meta,audio,render,ui,app}/index.ts` (empty barrels) and subfolders below them.

- [ ] **Step 1: Create directory tree**

```bash
mkdir -p \
  src/lib/__tests__ \
  src/engine/{pool,systems,__tests__} \
  src/world/__tests__ \
  src/entities/{towers,enemies,projectiles,__tests__} \
  src/content/{levels,__tests__} \
  src/difficulty/__tests__ \
  src/meta/migrations/__tests__ \
  src/meta/__tests__ \
  src/audio/assets \
  src/render/{shaders,layers} \
  src/ui/{components,modals} \
  src/app/{providers,screens}
```

- [ ] **Step 2: Add a project root barrel for sanity-checking the alias**

Create `/Users/renan/projects/tower-gemax/src/lib/index.ts` (empty for now):

```ts
export {};
```

- [ ] **Step 3: Verify TypeScript still compiles**

```bash
npm run tsc
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "chore: scaffold src/ folder skeleton"
```

### Task A5: Verify the app boots

**Files:** none modified (verification only).

- [ ] **Step 1: Edit `App.tsx` to a minimal known-good state**

Overwrite `/Users/renan/projects/tower-gemax/App.tsx`:

```tsx
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>tower-gemax · netrunner online</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#00F0FF',
    fontSize: 16,
    fontFamily: 'monospace',
  },
});
```

- [ ] **Step 2: Boot iOS simulator**

```bash
npx expo start --ios
```

Expected: simulator launches Expo Go, dark screen with cyan text reading `tower-gemax · netrunner online`.

- [ ] **Step 3: Boot Android emulator (optional, but recommended)**

```bash
npx expo start --android
```

Expected: same screen on Android.

- [ ] **Step 4: Stop Expo and commit**

```bash
git add App.tsx
git commit -m "feat: minimal boot screen"
```

### Task A6: Add README documenting the locked version triple

**Files:**
- Create: `README.md`

- [ ] **Step 1: Document setup and version pinning**

Create `/Users/renan/projects/tower-gemax/README.md`:

````markdown
# tower-gemax

Cyberpunk netrunner tower defense, built in React Native (Expo).

See [`docs/superpowers/specs/2026-05-04-tower-gemax-design.md`](docs/superpowers/specs/2026-05-04-tower-gemax-design.md) for the design and [`docs/superpowers/plans/2026-05-04-tower-gemax-foundation.md`](docs/superpowers/plans/2026-05-04-tower-gemax-foundation.md) for the build plan.

## Setup

```bash
nvm use            # picks up .nvmrc (20.11.1)
npm install
npx expo start
```

## Locked dependency triple

The Skia / Reanimated / Expo SDK trio is fragile across minor bumps. The known-working pin:

- `expo@52.0.11`
- `react-native@0.76.3`
- `@shopify/react-native-skia@1.5.10`
- `react-native-reanimated@3.16.7`

Bumping any of the above requires re-validating the others via `npx expo install --check`.

## Running tests

```bash
npm run test:engine    # pure TS engine, vitest, target <2s
npm test               # RN smoke, jest-expo
```
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with setup and locked deps"
```

---

## Phase B — Headless Game Engine (pure TypeScript, vitest)

End-of-phase checkpoint: a deterministic match runs entirely in vitest, asserting end state. No RN code. Engine test suite under 2 seconds.

### Task B1: `lib/` utilities

**Files:**
- Create: `src/lib/vec2.ts`, `src/lib/lerp.ts`, `src/lib/assert.ts`, `src/lib/debounce.ts`, `src/lib/id.ts`, `src/lib/types.ts`
- Test: `src/lib/__tests__/vec2.spec.ts`, `lerp.spec.ts`, `assert.spec.ts`, `debounce.spec.ts`, `id.spec.ts`

- [ ] **Step 1: Write tests for `vec2`**

Create `src/lib/__tests__/vec2.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { v2, add, sub, scale, length, distance, normalize, dot } from '@/lib/vec2';

describe('vec2', () => {
  it('constructs and adds', () => {
    expect(add(v2(1, 2), v2(3, 4))).toEqual({ x: 4, y: 6 });
  });
  it('subtracts and scales', () => {
    expect(sub(v2(5, 5), v2(1, 2))).toEqual({ x: 4, y: 3 });
    expect(scale(v2(2, 3), 2)).toEqual({ x: 4, y: 6 });
  });
  it('computes length and distance', () => {
    expect(length(v2(3, 4))).toBe(5);
    expect(distance(v2(0, 0), v2(3, 4))).toBe(5);
  });
  it('normalizes', () => {
    const n = normalize(v2(3, 4));
    expect(n.x).toBeCloseTo(0.6);
    expect(n.y).toBeCloseTo(0.8);
  });
  it('handles zero-length normalize', () => {
    expect(normalize(v2(0, 0))).toEqual({ x: 0, y: 0 });
  });
  it('computes dot product', () => {
    expect(dot(v2(1, 2), v2(3, 4))).toBe(11);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm run test:engine -- vec2
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement `vec2`**

Create `src/lib/vec2.ts`:

```ts
export type Vec2 = { x: number; y: number };

export const v2 = (x: number, y: number): Vec2 => ({ x, y });

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;

export const length = (a: Vec2): number => Math.hypot(a.x, a.y);
export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const normalize = (a: Vec2): Vec2 => {
  const len = length(a);
  if (len === 0) return { x: 0, y: 0 };
  return { x: a.x / len, y: a.y / len };
};
```

- [ ] **Step 4: Write tests for `lerp`**

Create `src/lib/__tests__/lerp.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { lerp, clamp, smoothstep } from '@/lib/lerp';

describe('lerp', () => {
  it('linearly interpolates', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });
});

describe('clamp', () => {
  it('clamps below min', () => { expect(clamp(-1, 0, 10)).toBe(0); });
  it('clamps above max', () => { expect(clamp(11, 0, 10)).toBe(10); });
  it('passes within range', () => { expect(clamp(5, 0, 10)).toBe(5); });
});

describe('smoothstep', () => {
  it('returns 0 at edge0', () => { expect(smoothstep(0, 1, 0)).toBe(0); });
  it('returns 1 at edge1', () => { expect(smoothstep(0, 1, 1)).toBe(1); });
  it('returns 0.5 at midpoint', () => { expect(smoothstep(0, 1, 0.5)).toBe(0.5); });
});
```

- [ ] **Step 5: Implement `lerp`**

Create `src/lib/lerp.ts`:

```ts
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const clamp = (x: number, min: number, max: number): number =>
  x < min ? min : x > max ? max : x;

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
```

- [ ] **Step 6: Write tests for `assert`**

Create `src/lib/__tests__/assert.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { invariant } from '@/lib/assert';

describe('invariant', () => {
  it('throws on falsy', () => {
    expect(() => invariant(false, 'oops')).toThrowError('oops');
  });
  it('does not throw on truthy', () => {
    expect(() => invariant(true, 'ok')).not.toThrow();
  });
  it('narrows the type after the call', () => {
    const x: number | null = 1 as number | null;
    invariant(x !== null, 'x must be set');
    // @ts-expect-error if narrowing fails to remove null
    const y: number = x;
    expect(y).toBe(1);
  });
});
```

- [ ] **Step 7: Implement `assert`**

Create `src/lib/assert.ts`:

```ts
export function invariant(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(`Invariant failed: ${message}`);
}
```

- [ ] **Step 8: Write tests for `debounce`**

Create `src/lib/__tests__/debounce.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { debounce } from '@/lib/debounce';

describe('debounce', () => {
  it('delays the call until the trailing edge', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d(); d(); d();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
  it('passes the latest arguments through', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 50);
    d(1); d(2); d(3);
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith(3);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 9: Implement `debounce`**

Create `src/lib/debounce.ts`:

```ts
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: A | null = null;
  return (...args: A) => {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (lastArgs) fn(...lastArgs);
    }, ms);
  };
}
```

- [ ] **Step 10: Write tests for `id`**

Create `src/lib/__tests__/id.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { makeIdGen } from '@/lib/id';

describe('makeIdGen', () => {
  it('issues monotonically increasing ids with the prefix', () => {
    const gen = makeIdGen();
    const a = gen('tower');
    const b = gen('tower');
    expect(a).not.toBe(b);
    expect(a.startsWith('tower:')).toBe(true);
    expect(b.startsWith('tower:')).toBe(true);
  });
  it('uses independent counters per prefix', () => {
    const gen = makeIdGen();
    const t = gen('tower');
    const e = gen('enemy');
    expect(t).toBe('tower:1');
    expect(e).toBe('enemy:1');
  });
});
```

- [ ] **Step 11: Implement `id`**

Create `src/lib/id.ts`:

```ts
export type IdGen = (prefix: string) => string;

export function makeIdGen(): IdGen {
  const counters = new Map<string, number>();
  return (prefix: string): string => {
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);
    return `${prefix}:${next}`;
  };
}
```

- [ ] **Step 12: Add `types.ts`**

Create `src/lib/types.ts`:

```ts
export type Brand<T, B extends string> = T & { readonly __brand: B };

export type DeepReadonly<T> =
  T extends (infer U)[] ? readonly DeepReadonly<U>[] :
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
  T;

export type GridCoord = { col: number; row: number };
```

- [ ] **Step 13: Run all lib tests**

```bash
npm run test:engine -- src/lib
```

Expected: all green.

- [ ] **Step 14: Commit**

```bash
git add src/lib/
git commit -m "feat(lib): vec2, lerp, assert, debounce, id, types with tests"
```

### Task B2: `SeededRng` (mulberry32)

**Files:**
- Create: `src/engine/rng.ts`
- Test: `src/engine/__tests__/rng.spec.ts`

- [ ] **Step 1: Write the test**

Create `src/engine/__tests__/rng.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SeededRng } from '@/engine/rng';

describe('SeededRng', () => {
  it('produces deterministic sequences for the same seed', () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });
  it('produces different sequences for different seeds', () => {
    const a = new SeededRng(1).next();
    const b = new SeededRng(2).next();
    expect(a).not.toBe(b);
  });
  it('returns floats in [0, 1)', () => {
    const r = new SeededRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('range(n) returns int in [0, n)', () => {
    const r = new SeededRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.range(10);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
    }
  });
  it('chance(p) returns true with frequency near p', () => {
    const r = new SeededRng(123);
    let hits = 0;
    for (let i = 0; i < 10000; i++) if (r.chance(0.25)) hits++;
    expect(hits).toBeGreaterThan(2200);
    expect(hits).toBeLessThan(2800);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:engine -- rng
```

Expected: FAIL.

- [ ] **Step 3: Implement `SeededRng`**

Create `src/engine/rng.ts`:

```ts
// Mulberry32 — small, fast, deterministic.
export class SeededRng {
  private state: number;

  constructor(seed: number) {
    // Force unsigned 32-bit
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(n: number): number {
    return Math.floor(this.next() * n);
  }

  rangeFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick from empty array');
    return arr[this.range(arr.length)] as T;
  }

  /** Snapshot for save/replay. */
  serialize(): number {
    return this.state;
  }

  static fromSerialized(state: number): SeededRng {
    const r = new SeededRng(0);
    r.state = state >>> 0;
    return r;
  }
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm run test:engine -- rng
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/rng.ts src/engine/__tests__/rng.spec.ts
git commit -m "feat(engine): SeededRng (mulberry32)"
```

### Task B3: `EventBus` (typed pub/sub)

**Files:**
- Create: `src/engine/EventBus.ts`
- Test: `src/engine/__tests__/EventBus.spec.ts`

- [ ] **Step 1: Write the test**

Create `src/engine/__tests__/EventBus.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { EventBus, type SimEventMap } from '@/engine/EventBus';

describe('EventBus', () => {
  it('emits and dispatches buffered events on flush()', () => {
    const bus = new EventBus<SimEventMap>();
    const fn = vi.fn();
    bus.on('enemy-died', fn);
    bus.emit('enemy-died', { enemyId: 'e:1', bounty: 10, killedByTowerId: 't:1' });
    expect(fn).not.toHaveBeenCalled(); // buffered
    bus.flush();
    expect(fn).toHaveBeenCalledWith({ enemyId: 'e:1', bounty: 10, killedByTowerId: 't:1' });
  });

  it('supports multiple subscribers', () => {
    const bus = new EventBus<SimEventMap>();
    const a = vi.fn(), b = vi.fn();
    bus.on('wave-cleared', a);
    bus.on('wave-cleared', b);
    bus.emit('wave-cleared', { waveIndex: 0 });
    bus.flush();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('off() removes a subscriber', () => {
    const bus = new EventBus<SimEventMap>();
    const fn = vi.fn();
    const off = bus.on('tower-placed', fn);
    off();
    bus.emit('tower-placed', { towerId: 't:1', kind: 'firewall' });
    bus.flush();
    expect(fn).not.toHaveBeenCalled();
  });

  it('clears the buffer after flush', () => {
    const bus = new EventBus<SimEventMap>();
    const fn = vi.fn();
    bus.on('life-lost', fn);
    bus.emit('life-lost', { enemyKind: 'worm' });
    bus.flush();
    bus.flush();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:engine -- EventBus
```

Expected: FAIL.

- [ ] **Step 3: Implement `EventBus`**

Create `src/engine/EventBus.ts`:

```ts
export type SimEventMap = {
  'enemy-died': { enemyId: string; bounty: number; killedByTowerId: string };
  'enemy-leaked': { enemyKind: string };
  'life-lost': { enemyKind: string };
  'wave-started': { waveIndex: number };
  'wave-cleared': { waveIndex: number };
  'tower-placed': { towerId: string; kind: string };
  'tower-sold': { towerId: string; refund: number };
  'tower-upgraded': { towerId: string; toLevel: 1 | 2 | 3 };
  'credits-changed': { credits: number };
  'lives-changed': { lives: number };
  'match-won': { stars: 0 | 1 | 2 | 3; shardsAwarded: number };
  'match-lost': { wavesCleared: number };
};

type Listener<T> = (payload: T) => void;

export class EventBus<M extends Record<string, unknown>> {
  private listeners = new Map<keyof M, Set<Listener<unknown>>>();
  private buffer: Array<{ key: keyof M; payload: unknown }> = [];

  on<K extends keyof M>(key: K, fn: Listener<M[K]>): () => void {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(fn as Listener<unknown>);
    return () => { set?.delete(fn as Listener<unknown>); };
  }

  emit<K extends keyof M>(key: K, payload: M[K]): void {
    this.buffer.push({ key, payload });
  }

  flush(): void {
    const events = this.buffer;
    this.buffer = [];
    for (const { key, payload } of events) {
      const set = this.listeners.get(key);
      if (!set) continue;
      for (const fn of set) (fn as Listener<unknown>)(payload);
    }
  }

  clear(): void {
    this.buffer = [];
    this.listeners.clear();
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test:engine -- EventBus
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/EventBus.ts src/engine/__tests__/EventBus.spec.ts
git commit -m "feat(engine): typed buffered EventBus"
```

### Task B4: `ObjectPool`

**Files:**
- Create: `src/engine/pool/ObjectPool.ts`
- Test: `src/engine/__tests__/ObjectPool.spec.ts`

- [ ] **Step 1: Write the test**

Create `src/engine/__tests__/ObjectPool.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ObjectPool } from '@/engine/pool/ObjectPool';

type Boxed = { value: number; alive: boolean };

describe('ObjectPool', () => {
  it('pre-allocates instances and reuses them', () => {
    let constructed = 0;
    const pool = new ObjectPool<Boxed>({
      create: () => { constructed++; return { value: 0, alive: false }; },
      reset: (b) => { b.value = 0; b.alive = false; },
      initialSize: 4,
    });
    expect(constructed).toBe(4);

    const a = pool.acquire(); a.value = 1; a.alive = true;
    const b = pool.acquire(); b.value = 2; b.alive = true;
    pool.release(a);
    const c = pool.acquire();
    expect(c).toBe(a);                // reused
    expect(c.value).toBe(0);          // reset was called
    expect(constructed).toBe(4);
  });

  it('grows when capacity is exceeded', () => {
    const pool = new ObjectPool<Boxed>({
      create: () => ({ value: 0, alive: false }),
      reset: (b) => { b.value = 0; b.alive = false; },
      initialSize: 1,
    });
    const a = pool.acquire();
    const b = pool.acquire();    // grow
    expect(a).not.toBe(b);
  });

  it('reports counts', () => {
    const pool = new ObjectPool<Boxed>({
      create: () => ({ value: 0, alive: false }),
      reset: (b) => { b.value = 0; },
      initialSize: 3,
    });
    expect(pool.freeCount).toBe(3);
    pool.acquire();
    expect(pool.freeCount).toBe(2);
    expect(pool.activeCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:engine -- ObjectPool
```

Expected: FAIL.

- [ ] **Step 3: Implement `ObjectPool`**

Create `src/engine/pool/ObjectPool.ts`:

```ts
export type ObjectPoolOptions<T> = {
  create: () => T;
  reset: (obj: T) => void;
  initialSize: number;
};

export class ObjectPool<T> {
  private free: T[] = [];
  private active = new Set<T>();
  private create: () => T;
  private reset: (obj: T) => void;

  constructor(opts: ObjectPoolOptions<T>) {
    this.create = opts.create;
    this.reset = opts.reset;
    for (let i = 0; i < opts.initialSize; i++) this.free.push(this.create());
  }

  acquire(): T {
    const obj = this.free.pop() ?? this.create();
    this.active.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (!this.active.delete(obj)) return;
    this.reset(obj);
    this.free.push(obj);
  }

  get freeCount(): number { return this.free.length; }
  get activeCount(): number { return this.active.size; }
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test:engine -- ObjectPool
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/pool/ObjectPool.ts src/engine/__tests__/ObjectPool.spec.ts
git commit -m "feat(engine): ObjectPool primitive"
```

### Task B5: `Viewport` (coordinate conversions)

**Files:**
- Create: `src/engine/Viewport.ts`
- Test: `src/engine/__tests__/Viewport.spec.ts`

- [ ] **Step 1: Write the test**

Create `src/engine/__tests__/Viewport.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Viewport } from '@/engine/Viewport';

describe('Viewport', () => {
  const vp = new Viewport({
    canvasWidthPx: 360,
    canvasHeightPx: 720,
    gridCols: 9,
    gridRows: 18,
    canvasOriginScreen: { x: 0, y: 80 },
    dpr: 2,
  });

  it('grid → world (canvas px)', () => {
    expect(vp.gridToWorld({ col: 0, row: 0 })).toEqual({ x: 20, y: 20 });   // tile center: tileSize/2 = 40/2
    expect(vp.gridToWorld({ col: 1, row: 1 })).toEqual({ x: 60, y: 60 });
  });

  it('world → grid', () => {
    expect(vp.worldToGrid({ x: 20, y: 20 })).toEqual({ col: 0, row: 0 });
    expect(vp.worldToGrid({ x: 79, y: 79 })).toEqual({ col: 1, row: 1 });
  });

  it('screen → world removes canvas origin', () => {
    expect(vp.screenToWorld({ x: 100, y: 180 })).toEqual({ x: 100, y: 100 });
  });

  it('world → screen adds canvas origin', () => {
    expect(vp.worldToScreen({ x: 100, y: 100 })).toEqual({ x: 100, y: 180 });
  });

  it('reports tile size', () => {
    expect(vp.tileSize).toBe(40);    // 360 / 9
  });

  it('clamps grid coords to bounds in worldToGrid', () => {
    expect(vp.worldToGrid({ x: -5, y: -5 })).toEqual({ col: 0, row: 0 });
    expect(vp.worldToGrid({ x: 99999, y: 99999 })).toEqual({ col: 8, row: 17 });
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:engine -- Viewport
```

Expected: FAIL.

- [ ] **Step 3: Implement `Viewport`**

Create `src/engine/Viewport.ts`:

```ts
import { type Vec2 } from '@/lib/vec2';
import { type GridCoord } from '@/lib/types';
import { clamp } from '@/lib/lerp';

export type ViewportOptions = {
  canvasWidthPx: number;
  canvasHeightPx: number;
  gridCols: number;
  gridRows: number;
  canvasOriginScreen: Vec2;       // top-left of <Canvas> in screen coords
  dpr: number;
};

export class Viewport {
  readonly canvasWidthPx: number;
  readonly canvasHeightPx: number;
  readonly gridCols: number;
  readonly gridRows: number;
  readonly canvasOriginScreen: Vec2;
  readonly dpr: number;
  readonly tileSize: number;

  constructor(opts: ViewportOptions) {
    this.canvasWidthPx = opts.canvasWidthPx;
    this.canvasHeightPx = opts.canvasHeightPx;
    this.gridCols = opts.gridCols;
    this.gridRows = opts.gridRows;
    this.canvasOriginScreen = opts.canvasOriginScreen;
    this.dpr = opts.dpr;
    // Square tiles sized to fit width; portrait map taller than wide.
    this.tileSize = opts.canvasWidthPx / opts.gridCols;
  }

  gridToWorld(g: GridCoord): Vec2 {
    return {
      x: g.col * this.tileSize + this.tileSize / 2,
      y: g.row * this.tileSize + this.tileSize / 2,
    };
  }

  worldToGrid(w: Vec2): GridCoord {
    return {
      col: clamp(Math.floor(w.x / this.tileSize), 0, this.gridCols - 1),
      row: clamp(Math.floor(w.y / this.tileSize), 0, this.gridRows - 1),
    };
  }

  screenToWorld(s: Vec2): Vec2 {
    return { x: s.x - this.canvasOriginScreen.x, y: s.y - this.canvasOriginScreen.y };
  }

  worldToScreen(w: Vec2): Vec2 {
    return { x: w.x + this.canvasOriginScreen.x, y: w.y + this.canvasOriginScreen.y };
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test:engine -- Viewport
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/Viewport.ts src/engine/__tests__/Viewport.spec.ts
git commit -m "feat(engine): Viewport coordinate conversions"
```

### Task B6: `Path` (polyline + distAlongPath ↔ xy)

**Files:**
- Create: `src/world/Path.ts`
- Test: `src/world/__tests__/Path.spec.ts`

- [ ] **Step 1: Write the test**

Create `src/world/__tests__/Path.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Path } from '@/world/Path';

describe('Path', () => {
  // L-shape: (0,0) → (4,0) → (4,3). Total length: 4 + 3 = 7 (in tile units).
  const p = new Path([
    { col: 0, row: 0 },
    { col: 4, row: 0 },
    { col: 4, row: 3 },
  ], 1);    // tileSize=1 for math simplicity in tests

  it('reports total length', () => {
    expect(p.totalLength).toBeCloseTo(7);
  });

  it('xyAtDistance(0) returns the first waypoint center', () => {
    expect(p.xyAtDistance(0)).toEqual({ x: 0.5, y: 0.5 });
  });

  it('xyAtDistance interpolates along the first segment', () => {
    const xy = p.xyAtDistance(2);
    expect(xy.x).toBeCloseTo(2.5);
    expect(xy.y).toBeCloseTo(0.5);
  });

  it('xyAtDistance handles a corner', () => {
    const xy = p.xyAtDistance(4);
    expect(xy.x).toBeCloseTo(4.5);
    expect(xy.y).toBeCloseTo(0.5);
  });

  it('xyAtDistance interpolates along the second segment', () => {
    const xy = p.xyAtDistance(5.5);
    expect(xy.x).toBeCloseTo(4.5);
    expect(xy.y).toBeCloseTo(2.0);
  });

  it('xyAtDistance clamps past total length', () => {
    const xy = p.xyAtDistance(9999);
    expect(xy.x).toBeCloseTo(4.5);
    expect(xy.y).toBeCloseTo(3.5);
  });

  it('reachedEnd is true at totalLength', () => {
    expect(p.reachedEnd(p.totalLength - 0.0001)).toBe(false);
    expect(p.reachedEnd(p.totalLength)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:engine -- Path
```

Expected: FAIL.

- [ ] **Step 3: Implement `Path`**

Create `src/world/Path.ts`:

```ts
import { type Vec2 } from '@/lib/vec2';
import { type GridCoord } from '@/lib/types';

type Segment = {
  start: Vec2;
  end: Vec2;
  length: number;
  cumulativeStart: number;     // distance from path origin to segment.start
};

/**
 * A polyline through grid cell centers. distAlongPath ∈ [0, totalLength]
 * maps to a (world) xy via O(log N) binary search across segments.
 */
export class Path {
  private segments: Segment[] = [];
  readonly totalLength: number;
  readonly tileSize: number;

  constructor(waypoints: readonly GridCoord[], tileSize: number) {
    if (waypoints.length < 2) throw new Error('Path needs at least 2 waypoints');
    this.tileSize = tileSize;

    let cumulative = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = this.cellCenter(waypoints[i]!);
      const b = this.cellCenter(waypoints[i + 1]!);
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      this.segments.push({ start: a, end: b, length: len, cumulativeStart: cumulative });
      cumulative += len;
    }
    this.totalLength = cumulative;
  }

  private cellCenter(g: GridCoord): Vec2 {
    return {
      x: (g.col + 0.5) * this.tileSize,
      y: (g.row + 0.5) * this.tileSize,
    };
  }

  xyAtDistance(d: number): Vec2 {
    if (d <= 0) return this.segments[0]!.start;
    if (d >= this.totalLength) return this.segments[this.segments.length - 1]!.end;
    // Binary search for the segment containing d.
    let lo = 0, hi = this.segments.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      const s = this.segments[mid]!;
      if (d < s.cumulativeStart) hi = mid - 1;
      else if (d >= s.cumulativeStart + s.length) lo = mid + 1;
      else { lo = hi = mid; }
    }
    const seg = this.segments[lo]!;
    const t = (d - seg.cumulativeStart) / seg.length;
    return {
      x: seg.start.x + (seg.end.x - seg.start.x) * t,
      y: seg.start.y + (seg.end.y - seg.start.y) * t,
    };
  }

  reachedEnd(d: number): boolean {
    return d >= this.totalLength;
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test:engine -- Path
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/world/Path.ts src/world/__tests__/Path.spec.ts
git commit -m "feat(world): Path polyline with O(log N) sampling"
```

### Task B7: `Grid` (build validity)

**Files:**
- Create: `src/world/Grid.ts`
- Test: `src/world/__tests__/Grid.spec.ts`

- [ ] **Step 1: Write the test**

Create `src/world/__tests__/Grid.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { BuildGrid, TileType } from '@/world/Grid';

const layout: TileType[][] = [
  ['buildable', 'buildable', 'path'],
  ['blocked',   'buildable', 'path'],
  ['buildable', 'buildable', 'path'],
];

describe('BuildGrid', () => {
  it('reports tile type', () => {
    const g = new BuildGrid({ cols: 3, rows: 3, cells: layout });
    expect(g.tileAt({ col: 0, row: 0 })).toBe('buildable');
    expect(g.tileAt({ col: 2, row: 0 })).toBe('path');
    expect(g.tileAt({ col: 0, row: 1 })).toBe('blocked');
  });

  it('canBuild rejects path/blocked/out-of-bounds', () => {
    const g = new BuildGrid({ cols: 3, rows: 3, cells: layout });
    expect(g.canBuild({ col: 0, row: 0 })).toBe(true);
    expect(g.canBuild({ col: 2, row: 0 })).toBe(false);
    expect(g.canBuild({ col: 0, row: 1 })).toBe(false);
    expect(g.canBuild({ col: -1, row: 0 })).toBe(false);
    expect(g.canBuild({ col: 5, row: 5 })).toBe(false);
  });

  it('canBuild rejects already-occupied tiles', () => {
    const g = new BuildGrid({ cols: 3, rows: 3, cells: layout });
    g.occupy({ col: 0, row: 0 }, 'tower:1');
    expect(g.canBuild({ col: 0, row: 0 })).toBe(false);
    expect(g.occupantAt({ col: 0, row: 0 })).toBe('tower:1');
  });

  it('vacate removes the occupant', () => {
    const g = new BuildGrid({ cols: 3, rows: 3, cells: layout });
    g.occupy({ col: 0, row: 0 }, 'tower:1');
    g.vacate({ col: 0, row: 0 });
    expect(g.canBuild({ col: 0, row: 0 })).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:engine -- Grid
```

Expected: FAIL.

- [ ] **Step 3: Implement `BuildGrid`**

Create `src/world/Grid.ts`:

```ts
import { type GridCoord } from '@/lib/types';

export type TileType = 'path' | 'buildable' | 'blocked';

export type GridSpec = {
  cols: number;
  rows: number;
  cells: TileType[][];     // [row][col]
};

export class BuildGrid {
  readonly cols: number;
  readonly rows: number;
  private cells: TileType[][];
  private occupants: Map<string, string> = new Map(); // "col,row" -> towerId

  constructor(spec: GridSpec) {
    if (spec.cells.length !== spec.rows) throw new Error('cells.length !== rows');
    for (const row of spec.cells) {
      if (row.length !== spec.cols) throw new Error('row.length !== cols');
    }
    this.cols = spec.cols;
    this.rows = spec.rows;
    this.cells = spec.cells.map((r) => r.slice());
  }

  private inBounds(g: GridCoord): boolean {
    return g.col >= 0 && g.col < this.cols && g.row >= 0 && g.row < this.rows;
  }

  private key(g: GridCoord): string { return `${g.col},${g.row}`; }

  tileAt(g: GridCoord): TileType | null {
    if (!this.inBounds(g)) return null;
    return this.cells[g.row]![g.col]!;
  }

  canBuild(g: GridCoord): boolean {
    if (!this.inBounds(g)) return false;
    if (this.cells[g.row]![g.col]! !== 'buildable') return false;
    return !this.occupants.has(this.key(g));
  }

  occupy(g: GridCoord, towerId: string): void {
    if (!this.canBuild(g)) throw new Error(`cannot occupy ${this.key(g)}`);
    this.occupants.set(this.key(g), towerId);
  }

  vacate(g: GridCoord): void {
    this.occupants.delete(this.key(g));
  }

  occupantAt(g: GridCoord): string | undefined {
    return this.occupants.get(this.key(g));
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test:engine -- Grid
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/world/Grid.ts src/world/__tests__/Grid.spec.ts
git commit -m "feat(world): BuildGrid with occupancy tracking"
```

### Task B8: `StatusEffect` type and helpers

**Files:**
- Create: `src/entities/StatusEffect.ts`
- Test: `src/entities/__tests__/StatusEffect.spec.ts`

- [ ] **Step 1: Write the test**

Create `src/entities/__tests__/StatusEffect.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  type StatusEffect, freshStatus, tickStatuses, slowMultiplier, isFrozenOrStunned,
} from '@/entities/StatusEffect';

describe('StatusEffect helpers', () => {
  it('tickStatuses decrements remaining and removes expired', () => {
    const list: StatusEffect[] = [
      freshStatus({ kind: 'slow', magnitude: 0.5, duration: 1.0, appliedByTowerId: 't:1' }),
      freshStatus({ kind: 'freeze', magnitude: 1.0, duration: 0.5, appliedByTowerId: 't:2' }),
    ];
    tickStatuses(list, 0.6);
    expect(list).toHaveLength(1);     // freeze expired
    expect(list[0]!.kind).toBe('slow');
    expect(list[0]!.remaining).toBeCloseTo(0.4);
  });

  it('slowMultiplier returns the strongest slow', () => {
    const list: StatusEffect[] = [
      freshStatus({ kind: 'slow', magnitude: 0.3, duration: 1, appliedByTowerId: 't:1' }),
      freshStatus({ kind: 'slow', magnitude: 0.6, duration: 1, appliedByTowerId: 't:2' }),
    ];
    expect(slowMultiplier(list)).toBeCloseTo(0.4); // 1 - 0.6
  });

  it('isFrozenOrStunned is true if any freeze/stun present', () => {
    const list: StatusEffect[] = [
      freshStatus({ kind: 'slow', magnitude: 0.3, duration: 1, appliedByTowerId: 't:1' }),
    ];
    expect(isFrozenOrStunned(list)).toBe(false);
    list.push(freshStatus({ kind: 'freeze', magnitude: 1, duration: 1, appliedByTowerId: 't:2' }));
    expect(isFrozenOrStunned(list)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:engine -- StatusEffect
```

Expected: FAIL.

- [ ] **Step 3: Implement `StatusEffect`**

Create `src/entities/StatusEffect.ts`:

```ts
export type StatusKind = 'slow' | 'stun' | 'dot' | 'freeze';

export type StatusEffect = {
  kind: StatusKind;
  magnitude: number;       // slow ratio, dot dps, etc.
  duration: number;        // seconds applied
  remaining: number;       // seconds left
  appliedByTowerId: string;
};

export function freshStatus(opts: {
  kind: StatusKind;
  magnitude: number;
  duration: number;
  appliedByTowerId: string;
}): StatusEffect {
  return { ...opts, remaining: opts.duration };
}

/** Mutate in place: decrement remaining, drop expired entries. */
export function tickStatuses(list: StatusEffect[], dt: number): void {
  let write = 0;
  for (let read = 0; read < list.length; read++) {
    const s = list[read]!;
    s.remaining -= dt;
    if (s.remaining > 0) {
      list[write++] = s;
    }
  }
  list.length = write;
}

/** Effective speed multiplier from slows. 1 = no slow, 0 = full stop. */
export function slowMultiplier(list: readonly StatusEffect[]): number {
  let strongest = 0;
  for (const s of list) {
    if (s.kind === 'slow' && s.magnitude > strongest) strongest = s.magnitude;
  }
  return 1 - strongest;
}

export function isFrozenOrStunned(list: readonly StatusEffect[]): boolean {
  for (const s of list) if (s.kind === 'freeze' || s.kind === 'stun') return true;
  return false;
}

/** Aggregate DoT damage per second across active dot statuses. */
export function totalDotDps(list: readonly StatusEffect[]): number {
  let total = 0;
  for (const s of list) if (s.kind === 'dot') total += s.magnitude;
  return total;
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test:engine -- StatusEffect
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/entities/StatusEffect.ts src/entities/__tests__/StatusEffect.spec.ts
git commit -m "feat(entities): StatusEffect type + helpers"
```

### Task B9: `Entity` base + `getStat` resolver

**Files:**
- Create: `src/entities/Entity.ts`, `src/entities/getStat.ts`
- Test: `src/entities/__tests__/getStat.spec.ts`

- [ ] **Step 1: Implement `Entity` base**

Create `src/entities/Entity.ts`:

```ts
export abstract class Entity {
  readonly id: string;
  readonly kind: string;
  x: number;
  y: number;
  alive: boolean = true;

  constructor(opts: { id: string; kind: string; x: number; y: number }) {
    this.id = opts.id;
    this.kind = opts.kind;
    this.x = opts.x;
    this.y = opts.y;
  }
}
```

- [ ] **Step 2: Define minimal types `getStat` reads from**

Create `src/entities/getStat.ts`:

```ts
import { slowMultiplier, isFrozenOrStunned } from '@/entities/StatusEffect';

/**
 * StatContext is everything getStat needs. Keep it interface-narrow so tests
 * don't have to instantiate a full World.
 */
export type StatContext = {
  difficulty: {
    enemyHpMult: number;
    enemySpeedMult: number;
  };
  effects: {
    towerStatMults: Partial<Record<string, Partial<Record<string, number>>>>;
    // example: { firewall: { damage: 1.10 } }
  };
};

type StattedTower = {
  kind: 'tower';
  defKind: string;
  base: { damage: number; range: number; fireRate: number };
};

type StattedEnemy = {
  kind: 'enemy';
  defKind: string;
  base: { hp: number; speed: number; armor: number };
  statuses: import('@/entities/StatusEffect').StatusEffect[];
};

export function getTowerStat(
  t: StattedTower,
  stat: 'damage' | 'range' | 'fireRate',
  ctx: StatContext,
): number {
  const base = t.base[stat];
  const mult = ctx.effects.towerStatMults[t.defKind]?.[stat] ?? 1;
  return base * mult;
}

export function getEnemyStat(
  e: StattedEnemy,
  stat: 'hp' | 'speed' | 'armor',
  ctx: StatContext,
): number {
  const base = e.base[stat];
  if (stat === 'hp') return base * ctx.difficulty.enemyHpMult;
  if (stat === 'armor') return base;
  // speed: difficulty mult, then statuses
  if (isFrozenOrStunned(e.statuses)) return 0;
  return base * ctx.difficulty.enemySpeedMult * slowMultiplier(e.statuses);
}
```

- [ ] **Step 3: Write tests**

Create `src/entities/__tests__/getStat.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getTowerStat, getEnemyStat, type StatContext } from '@/entities/getStat';
import { freshStatus } from '@/entities/StatusEffect';

const ctx = (over: Partial<StatContext> = {}): StatContext => ({
  difficulty: { enemyHpMult: 1, enemySpeedMult: 1, ...over.difficulty },
  effects: { towerStatMults: {}, ...over.effects },
});

describe('getTowerStat', () => {
  const t = { kind: 'tower' as const, defKind: 'firewall', base: { damage: 10, range: 3, fireRate: 1 } };

  it('returns base value when no effects', () => {
    expect(getTowerStat(t, 'damage', ctx())).toBe(10);
  });
  it('applies effect multipliers', () => {
    const c = ctx({ effects: { towerStatMults: { firewall: { damage: 1.2 } } } });
    expect(getTowerStat(t, 'damage', c)).toBeCloseTo(12);
  });
});

describe('getEnemyStat', () => {
  const e = (statuses: any[] = []) => ({
    kind: 'enemy' as const,
    defKind: 'worm',
    base: { hp: 20, speed: 2, armor: 0 },
    statuses,
  });

  it('applies enemyHpMult', () => {
    expect(getEnemyStat(e(), 'hp', ctx({ difficulty: { enemyHpMult: 1.75, enemySpeedMult: 1 } }))).toBe(35);
  });
  it('returns 0 speed if stunned/frozen', () => {
    const en = e([freshStatus({ kind: 'freeze', magnitude: 1, duration: 1, appliedByTowerId: 't' })]);
    expect(getEnemyStat(en, 'speed', ctx())).toBe(0);
  });
  it('applies slow multiplier on top of difficulty', () => {
    const en = e([freshStatus({ kind: 'slow', magnitude: 0.5, duration: 1, appliedByTowerId: 't' })]);
    const c = ctx({ difficulty: { enemyHpMult: 1, enemySpeedMult: 1.10 } });
    expect(getEnemyStat(en, 'speed', c)).toBeCloseTo(2 * 1.10 * 0.5);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm run test:engine -- getStat
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/entities/Entity.ts src/entities/getStat.ts src/entities/__tests__/getStat.spec.ts
git commit -m "feat(entities): Entity base + getStat resolver"
```

### Task B10: `Tower` base class + 3 subclasses

**Files:**
- Create: `src/entities/Tower.ts`, `src/entities/towers/FirewallTower.ts`, `src/entities/towers/LogicBombTower.ts`, `src/entities/towers/ICELanceTower.ts`
- Test: `src/entities/__tests__/Tower.spec.ts`

- [ ] **Step 1: Implement `Tower` base**

Create `src/entities/Tower.ts`:

```ts
import { Entity } from '@/entities/Entity';
import { type GridCoord } from '@/lib/types';

export type TargetPriority = 'first' | 'last' | 'strongest' | 'weakest' | 'closest';
export type TowerTargets = 'ground' | 'flying' | 'both';

export type TowerInit = {
  id: string;
  defKind: string;
  level: 1 | 2 | 3;
  x: number;
  y: number;
  tileCoord: GridCoord;
  baseStats: { damage: number; range: number; fireRate: number };
  projectileKind: string;
  targets: TowerTargets;
  defaultTargetPriority: TargetPriority;
};

export abstract class Tower extends Entity {
  defKind: string;
  level: 1 | 2 | 3;
  tileCoord: GridCoord;
  base: { damage: number; range: number; fireRate: number };
  projectileKind: string;
  targets: TowerTargets;
  targetPriority: TargetPriority;
  cooldown: number = 0;     // seconds remaining

  constructor(init: TowerInit) {
    super({ id: init.id, kind: `tower:${init.defKind}`, x: init.x, y: init.y });
    this.defKind = init.defKind;
    this.level = init.level;
    this.tileCoord = init.tileCoord;
    this.base = { ...init.baseStats };
    this.projectileKind = init.projectileKind;
    this.targets = init.targets;
    this.targetPriority = init.defaultTargetPriority;
  }
}
```

- [ ] **Step 2: Implement subclasses**

Create `src/entities/towers/FirewallTower.ts`:

```ts
import { Tower } from '@/entities/Tower';

export class FirewallTower extends Tower {}
```

Create `src/entities/towers/LogicBombTower.ts`:

```ts
import { Tower } from '@/entities/Tower';

export class LogicBombTower extends Tower {
  /** Radius of AoE pulse on detonation, in tiles. */
  blastRadius: number = 1.5;
}
```

Create `src/entities/towers/ICELanceTower.ts`:

```ts
import { Tower } from '@/entities/Tower';

export class ICELanceTower extends Tower {
  /** Freeze duration applied on hit, in seconds. */
  freezeDuration: number = 1.0;
}
```

- [ ] **Step 3: Smoke test the classes**

Create `src/entities/__tests__/Tower.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { FirewallTower } from '@/entities/towers/FirewallTower';
import { LogicBombTower } from '@/entities/towers/LogicBombTower';
import { ICELanceTower } from '@/entities/towers/ICELanceTower';

describe('Tower subclasses', () => {
  const init = {
    id: 't:1',
    level: 1 as const,
    x: 0, y: 0,
    tileCoord: { col: 0, row: 0 },
    baseStats: { damage: 10, range: 3, fireRate: 1 },
    projectileKind: 'hitscan-bolt',
    targets: 'both' as const,
    defaultTargetPriority: 'first' as const,
  };

  it('FirewallTower constructs', () => {
    const t = new FirewallTower({ ...init, defKind: 'firewall' });
    expect(t.kind).toBe('tower:firewall');
    expect(t.targetPriority).toBe('first');
  });

  it('LogicBombTower has blastRadius', () => {
    const t = new LogicBombTower({ ...init, defKind: 'logic-bomb' });
    expect(t.blastRadius).toBeGreaterThan(0);
  });

  it('ICELanceTower has freezeDuration', () => {
    const t = new ICELanceTower({ ...init, defKind: 'ice-lance' });
    expect(t.freezeDuration).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm run test:engine -- Tower
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/entities/Tower.ts src/entities/towers/ src/entities/__tests__/Tower.spec.ts
git commit -m "feat(entities): Tower base + Firewall/LogicBomb/ICELance subclasses"
```

### Task B11: `Enemy` base class + 4 subclasses

**Files:**
- Create: `src/entities/Enemy.ts`, `src/entities/enemies/{Worm,Trojan,Daemon,Rootkit}Enemy.ts`
- Test: `src/entities/__tests__/Enemy.spec.ts`

- [ ] **Step 1: Implement `Enemy` base**

Create `src/entities/Enemy.ts`:

```ts
import { Entity } from '@/entities/Entity';
import { type StatusEffect } from '@/entities/StatusEffect';

export type EnemyInit = {
  id: string;
  defKind: string;
  baseStats: { hp: number; speed: number; armor: number };
  bounty: number;
  flying: boolean;
  spawnerId: string;
};

export abstract class Enemy extends Entity {
  defKind: string;
  hp: number;
  maxHp: number;
  base: { hp: number; speed: number; armor: number };
  bounty: number;
  flying: boolean;
  pathIndex: number = 0;
  distAlongPath: number = 0;
  statuses: StatusEffect[] = [];
  lastDamagedBy: string | null = null;
  spawnerId: string;

  constructor(init: EnemyInit) {
    super({ id: init.id, kind: `enemy:${init.defKind}`, x: 0, y: 0 });
    this.defKind = init.defKind;
    this.base = { ...init.baseStats };
    this.hp = init.baseStats.hp;
    this.maxHp = init.baseStats.hp;
    this.bounty = init.bounty;
    this.flying = init.flying;
    this.spawnerId = init.spawnerId;
  }
}
```

- [ ] **Step 2: Implement subclasses**

Create `src/entities/enemies/WormEnemy.ts`:

```ts
import { Enemy } from '@/entities/Enemy';
export class WormEnemy extends Enemy {}
```

Create `src/entities/enemies/TrojanEnemy.ts`:

```ts
import { Enemy } from '@/entities/Enemy';
export class TrojanEnemy extends Enemy {}
```

Create `src/entities/enemies/DaemonEnemy.ts`:

```ts
import { Enemy } from '@/entities/Enemy';
export class DaemonEnemy extends Enemy {}
```

Create `src/entities/enemies/RootkitEnemy.ts`:

```ts
import { Enemy } from '@/entities/Enemy';
export class RootkitEnemy extends Enemy {}
```

(Subclasses are empty for now; behavior diverges through stats and content defs. They exist for `instanceof` checks in render layers.)

- [ ] **Step 3: Smoke test**

Create `src/entities/__tests__/Enemy.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import { RootkitEnemy } from '@/entities/enemies/RootkitEnemy';

describe('Enemy subclasses', () => {
  it('WormEnemy initializes hp=maxHp from base.hp', () => {
    const e = new WormEnemy({
      id: 'e:1', defKind: 'worm',
      baseStats: { hp: 18, speed: 2.6, armor: 0 },
      bounty: 4, flying: false, spawnerId: 'main',
    });
    expect(e.hp).toBe(18);
    expect(e.maxHp).toBe(18);
    expect(e.kind).toBe('enemy:worm');
    expect(e.statuses).toEqual([]);
  });

  it('RootkitEnemy has independent identity', () => {
    const e = new RootkitEnemy({
      id: 'e:b', defKind: 'rootkit',
      baseStats: { hp: 800, speed: 0.8, armor: 6 },
      bounty: 80, flying: false, spawnerId: 'main',
    });
    expect(e.kind).toBe('enemy:rootkit');
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm run test:engine -- Enemy
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/entities/Enemy.ts src/entities/enemies/ src/entities/__tests__/Enemy.spec.ts
git commit -m "feat(entities): Enemy base + Worm/Trojan/Daemon/Rootkit subclasses"
```

### Task B12: `Projectile` base + 3 subclasses

**Files:**
- Create: `src/entities/Projectile.ts`, `src/entities/projectiles/{Hitscan,Ballistic,AoEPulse}Projectile.ts`
- Test: `src/entities/__tests__/Projectile.spec.ts`

- [ ] **Step 1: Implement `Projectile` base + subclasses**

Create `src/entities/Projectile.ts`:

```ts
import { Entity } from '@/entities/Entity';

export type ProjectileInit = {
  id: string;
  kind: string;             // 'projectile:hitscan-bolt', etc.
  x: number;
  y: number;
  damage: number;
  sourceTowerId: string;
  ttl: number;              // seconds before despawn
};

export abstract class Projectile extends Entity {
  damage: number;
  sourceTowerId: string;
  ttl: number;

  constructor(init: ProjectileInit) {
    super({ id: init.id, kind: init.kind, x: init.x, y: init.y });
    this.damage = init.damage;
    this.sourceTowerId = init.sourceTowerId;
    this.ttl = init.ttl;
  }

  /** Reset state for pool reuse. */
  resetForPool(): void {
    this.alive = true;
    this.x = 0; this.y = 0;
    this.damage = 0;
    this.sourceTowerId = '';
    this.ttl = 0;
  }
}
```

Create `src/entities/projectiles/HitscanProjectile.ts`:

```ts
import { Projectile } from '@/entities/Projectile';

export class HitscanProjectile extends Projectile {
  /** Resolves on the same tick it was fired. */
  targetEnemyId: string | null = null;
}
```

Create `src/entities/projectiles/BallisticProjectile.ts`:

```ts
import { Projectile } from '@/entities/Projectile';

export class BallisticProjectile extends Projectile {
  vx: number = 0;
  vy: number = 0;
  targetEnemyId: string | null = null;
  speed: number = 6; // tiles/sec

  override resetForPool(): void {
    super.resetForPool();
    this.vx = 0; this.vy = 0; this.targetEnemyId = null;
  }
}
```

Create `src/entities/projectiles/AoEPulseProjectile.ts`:

```ts
import { Projectile } from '@/entities/Projectile';

export class AoEPulseProjectile extends Projectile {
  /** Maximum radius (tiles) the pulse expands to before despawn. */
  radius: number = 0;
  /** Current radius. */
  currentRadius: number = 0;
  /** Expansion rate, tiles per second. */
  expandRate: number = 8;
  /** Set of enemy ids already damaged (avoid double-hits in the same pulse). */
  hitEnemyIds: Set<string> = new Set();

  override resetForPool(): void {
    super.resetForPool();
    this.radius = 0;
    this.currentRadius = 0;
    this.hitEnemyIds.clear();
  }
}
```

- [ ] **Step 2: Smoke test**

Create `src/entities/__tests__/Projectile.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { HitscanProjectile } from '@/entities/projectiles/HitscanProjectile';
import { BallisticProjectile } from '@/entities/projectiles/BallisticProjectile';
import { AoEPulseProjectile } from '@/entities/projectiles/AoEPulseProjectile';

describe('Projectile subclasses', () => {
  const init = { id: 'p:1', kind: 'projectile:hitscan-bolt', x: 0, y: 0, damage: 8, sourceTowerId: 't:1', ttl: 0.1 };

  it('Hitscan constructs', () => {
    const p = new HitscanProjectile(init);
    expect(p.damage).toBe(8);
    expect(p.targetEnemyId).toBeNull();
  });

  it('Ballistic resetForPool clears velocity', () => {
    const p = new BallisticProjectile(init);
    p.vx = 5; p.vy = 5;
    p.resetForPool();
    expect(p.vx).toBe(0);
    expect(p.vy).toBe(0);
  });

  it('AoEPulse tracks hit enemies', () => {
    const p = new AoEPulseProjectile({ ...init, kind: 'projectile:aoe-pulse' });
    p.hitEnemyIds.add('e:1');
    expect(p.hitEnemyIds.has('e:1')).toBe(true);
    p.resetForPool();
    expect(p.hitEnemyIds.size).toBe(0);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm run test:engine -- Projectile
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/entities/Projectile.ts src/entities/projectiles/ src/entities/__tests__/Projectile.spec.ts
git commit -m "feat(entities): Projectile base + Hitscan/Ballistic/AoEPulse"
```

### Task B13: Content def types + registry

**Files:**
- Create: `src/content/types.ts`, `src/entities/registry.ts`
- Test: `src/entities/__tests__/registry.spec.ts`

- [ ] **Step 1: Define content types**

Create `src/content/types.ts`:

```ts
import { type Tower, type TargetPriority, type TowerTargets, type TowerInit } from '@/entities/Tower';
import { type Enemy, type EnemyInit } from '@/entities/Enemy';
import { type Projectile, type ProjectileInit } from '@/entities/Projectile';
import { type GridCoord, type DeepReadonly } from '@/lib/types';
import { type TileType } from '@/world/Grid';

export type TowerKind = 'firewall' | 'logic-bomb' | 'ice-lance';
export type EnemyKind = 'worm' | 'trojan' | 'daemon' | 'rootkit';
export type ProjectileKind = 'hitscan-bolt' | 'ballistic-pulse' | 'aoe-pulse';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'insane';

export type TowerDef = DeepReadonly<{
  kind: TowerKind;
  displayName: string;
  baseStats: { range: number; fireRate: number; damage: number };
  upgrades: ReadonlyArray<{ range: number; fireRate: number; damage: number; cost: number }>;
  cost: number;
  projectileKind: ProjectileKind;
  defaultTargetPriority: TargetPriority;
  targets: TowerTargets;
  classRef: new (init: TowerInit) => Tower;
}>;

export type EnemyDef = DeepReadonly<{
  kind: EnemyKind;
  displayName: string;
  baseStats: { hp: number; speed: number; armor: number };
  bounty: number;
  flying: boolean;
  classRef: new (init: EnemyInit) => Enemy;
}>;

export type ProjectileDef = DeepReadonly<{
  kind: ProjectileKind;
  speed?: number;
  ttl: number;
  classRef: new (init: ProjectileInit) => Projectile;
}>;

export type SpawnGroup = DeepReadonly<{
  id: string;
  spawnerId: string;
  enemyKind: EnemyKind;
  count: number;
  spacing: number;
  delay: number;
  afterGroupId?: string;
}>;

export type WaveDef = DeepReadonly<{
  delayBeforeStart: number;
  groups: ReadonlyArray<SpawnGroup>;
}>;

export type SpawnerSpec = DeepReadonly<{ id: string; tile: GridCoord }>;

export type LevelDef = DeepReadonly<{
  id: string;
  name: string;
  chapter: number;
  unlockRequires?: string;
  grid: { cols: number; rows: number; cells: ReadonlyArray<ReadonlyArray<TileType>> };
  spawners: ReadonlyArray<SpawnerSpec>;
  path: ReadonlyArray<GridCoord>;
  startCredits: number;
  startLives: number;
  waves: ReadonlyArray<WaveDef>;
  starThresholds: { stars3: number; stars2: number; stars1: number };
}>;

export type TechEffect =
  | { kind: 'tower-behavior-chain'; tower: TowerKind; chainCount: number }
  | { kind: 'tower-behavior-slow-field'; tower: 'logic-bomb'; duration: number; dotPerSecond?: number }
  | { kind: 'tower-behavior-crit'; tower: 'ice-lance'; chance: number; mult: number }
  | { kind: 'global-start-credits'; bonus: number }
  | { kind: 'global-sell-rebate'; ratio: number }
  | { kind: 'global-life-regen'; perMinute: number };

export type TechNode = DeepReadonly<{
  id: string;
  category: 'tower' | 'global';
  cost: number;
  requires: ReadonlyArray<string>;
  effect: TechEffect;
  displayName: string;
  description: string;
}>;
```

- [ ] **Step 2: Implement registry**

Create `src/entities/registry.ts`:

```ts
import type { TowerDef, EnemyDef, ProjectileDef, TowerKind, EnemyKind, ProjectileKind } from '@/content/types';
import { invariant } from '@/lib/assert';

const towers = new Map<TowerKind, TowerDef>();
const enemies = new Map<EnemyKind, EnemyDef>();
const projectiles = new Map<ProjectileKind, ProjectileDef>();

export function registerTowers(defs: readonly TowerDef[]): void {
  towers.clear();
  for (const def of defs) towers.set(def.kind, def);
}

export function registerEnemies(defs: readonly EnemyDef[]): void {
  enemies.clear();
  for (const def of defs) enemies.set(def.kind, def);
}

export function registerProjectiles(defs: readonly ProjectileDef[]): void {
  projectiles.clear();
  for (const def of defs) projectiles.set(def.kind, def);
}

export function getTowerDef(kind: TowerKind): TowerDef {
  const d = towers.get(kind);
  invariant(d, `tower not registered: ${kind}`);
  return d;
}

export function getEnemyDef(kind: EnemyKind): EnemyDef {
  const d = enemies.get(kind);
  invariant(d, `enemy not registered: ${kind}`);
  return d;
}

export function getProjectileDef(kind: ProjectileKind): ProjectileDef {
  const d = projectiles.get(kind);
  invariant(d, `projectile not registered: ${kind}`);
  return d;
}

export function listTowerKinds(): readonly TowerKind[] {
  return Array.from(towers.keys());
}

/** Test helper: clear all registries. */
export function _resetRegistry(): void {
  towers.clear();
  enemies.clear();
  projectiles.clear();
}
```

- [ ] **Step 3: Write tests**

Create `src/entities/__tests__/registry.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { registerTowers, getTowerDef, _resetRegistry } from '@/entities/registry';
import { FirewallTower } from '@/entities/towers/FirewallTower';

const sampleTower = {
  kind: 'firewall' as const,
  displayName: 'Firewall',
  baseStats: { range: 3.5, fireRate: 1.2, damage: 8 },
  upgrades: [],
  cost: 50,
  projectileKind: 'hitscan-bolt' as const,
  defaultTargetPriority: 'first' as const,
  targets: 'both' as const,
  classRef: FirewallTower,
};

describe('registry', () => {
  beforeEach(() => { _resetRegistry(); });

  it('registers and retrieves a tower def', () => {
    registerTowers([sampleTower]);
    expect(getTowerDef('firewall').displayName).toBe('Firewall');
  });

  it('throws on missing tower', () => {
    expect(() => getTowerDef('firewall')).toThrowError(/not registered/);
  });

  it('replaces previous registrations', () => {
    registerTowers([sampleTower]);
    registerTowers([{ ...sampleTower, displayName: 'Replaced' }]);
    expect(getTowerDef('firewall').displayName).toBe('Replaced');
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm run test:engine -- registry
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/content/types.ts src/entities/registry.ts src/entities/__tests__/registry.spec.ts
git commit -m "feat(entities): content type defs + registry with explicit registration"
```

### Task B14: Difficulty selector

**Files:**
- Create: `src/difficulty/selector.ts`
- Test: `src/difficulty/__tests__/selector.spec.ts`

- [ ] **Step 1: Implement selector**

Create `src/difficulty/selector.ts`:

```ts
import type { Difficulty } from '@/content/types';

export type SelectorMultipliers = {
  enemyHpMult: number;
  enemySpeedMult: number;
  startCreditsMult: number;
  shardRewardMult: number;
};

export const SELECTOR_MULTS: Readonly<Record<Difficulty, SelectorMultipliers>> = {
  easy:   { enemyHpMult: 0.80, enemySpeedMult: 1.00, startCreditsMult: 1.15, shardRewardMult: 0.5 },
  normal: { enemyHpMult: 1.00, enemySpeedMult: 1.00, startCreditsMult: 1.00, shardRewardMult: 1.0 },
  hard:   { enemyHpMult: 1.35, enemySpeedMult: 1.10, startCreditsMult: 0.90, shardRewardMult: 1.5 },
  insane: { enemyHpMult: 1.75, enemySpeedMult: 1.10, startCreditsMult: 0.85, shardRewardMult: 2.5 },
};

export function getSelectorMults(d: Difficulty): SelectorMultipliers {
  return SELECTOR_MULTS[d];
}
```

- [ ] **Step 2: Test it**

Create `src/difficulty/__tests__/selector.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getSelectorMults, SELECTOR_MULTS } from '@/difficulty/selector';

describe('selector', () => {
  it('Normal is the identity', () => {
    expect(getSelectorMults('normal')).toEqual({
      enemyHpMult: 1, enemySpeedMult: 1, startCreditsMult: 1, shardRewardMult: 1,
    });
  });
  it('Insane matches the spec table', () => {
    const s = getSelectorMults('insane');
    expect(s.enemyHpMult).toBe(1.75);
    expect(s.enemySpeedMult).toBe(1.10);
    expect(s.shardRewardMult).toBe(2.5);
  });
  it('Easy has only the credit buff (speed identity)', () => {
    const s = getSelectorMults('easy');
    expect(s.enemySpeedMult).toBe(1.0);
    expect(s.startCreditsMult).toBe(1.15);
  });
  it('all four difficulties enumerated', () => {
    expect(Object.keys(SELECTOR_MULTS).sort()).toEqual(['easy', 'hard', 'insane', 'normal']);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm run test:engine -- selector
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/difficulty/selector.ts src/difficulty/__tests__/selector.spec.ts
git commit -m "feat(difficulty): per-match selector multipliers"
```

### Task B15: Chapter ramp with soft cap

**Files:**
- Create: `src/difficulty/ramp.ts`
- Test: `src/difficulty/__tests__/ramp.spec.ts`

- [ ] **Step 1: Implement ramp**

Create `src/difficulty/ramp.ts`:

```ts
const HP_RATE = 0.07;
const SPEED_RATE = 0.04;
const HP_CAP = 2.0;
const SPEED_CAP = 1.20;

export type ChapterMultipliers = { hp: number; speed: number };

export function chapterMultipliers(chapterIndex: number): ChapterMultipliers {
  if (chapterIndex < 0) throw new Error('chapterIndex must be >= 0');
  return {
    hp: Math.min(1 + HP_RATE * chapterIndex, HP_CAP),
    speed: Math.min(1 + SPEED_RATE * chapterIndex, SPEED_CAP),
  };
}
```

- [ ] **Step 2: Test it**

Create `src/difficulty/__tests__/ramp.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { chapterMultipliers } from '@/difficulty/ramp';

describe('ramp', () => {
  it('chapter 0 returns identity', () => {
    expect(chapterMultipliers(0)).toEqual({ hp: 1, speed: 1 });
  });
  it('chapter 5 hp = 1 + 0.07*5 = 1.35', () => {
    expect(chapterMultipliers(5).hp).toBeCloseTo(1.35);
    expect(chapterMultipliers(5).speed).toBeCloseTo(1.20);
  });
  it('caps hp at 2.0 and speed at 1.20', () => {
    const c = chapterMultipliers(50);
    expect(c.hp).toBe(2.0);
    expect(c.speed).toBe(1.20);
  });
  it('rejects negative chapter index', () => {
    expect(() => chapterMultipliers(-1)).toThrow();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm run test:engine -- ramp
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/difficulty/ramp.ts src/difficulty/__tests__/ramp.spec.ts
git commit -m "feat(difficulty): chapter ramp with hp/speed soft cap"
```

### Task B16: `DifficultyContext` (combined)

**Files:**
- Create: `src/difficulty/DifficultyContext.ts`
- Test: `src/difficulty/__tests__/DifficultyContext.spec.ts`

- [ ] **Step 1: Implement context**

Create `src/difficulty/DifficultyContext.ts`:

```ts
import type { Difficulty } from '@/content/types';
import { getSelectorMults } from '@/difficulty/selector';
import { chapterMultipliers } from '@/difficulty/ramp';

export type DifficultyContext = {
  selector: Difficulty;
  chapterIndex: number;
  enemyHpMult: number;
  enemySpeedMult: number;
  startCreditsMult: number;
  shardRewardMult: number;
};

export function createDifficultyContext(opts: {
  selector: Difficulty;
  chapterIndex: number;
}): DifficultyContext {
  const sel = getSelectorMults(opts.selector);
  const ch = chapterMultipliers(opts.chapterIndex);
  return {
    selector: opts.selector,
    chapterIndex: opts.chapterIndex,
    enemyHpMult: sel.enemyHpMult * ch.hp,
    enemySpeedMult: sel.enemySpeedMult * ch.speed,
    startCreditsMult: sel.startCreditsMult,
    shardRewardMult: sel.shardRewardMult,
  };
}
```

- [ ] **Step 2: Test it**

Create `src/difficulty/__tests__/DifficultyContext.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createDifficultyContext } from '@/difficulty/DifficultyContext';

describe('createDifficultyContext', () => {
  it('combines selector × chapter ramp on hp/speed', () => {
    const ctx = createDifficultyContext({ selector: 'insane', chapterIndex: 5 });
    expect(ctx.enemyHpMult).toBeCloseTo(1.75 * 1.35);
    expect(ctx.enemySpeedMult).toBeCloseTo(1.10 * 1.20);
  });
  it('respects soft cap at very high chapters', () => {
    const ctx = createDifficultyContext({ selector: 'insane', chapterIndex: 100 });
    expect(ctx.enemyHpMult).toBeCloseTo(1.75 * 2.0);
    expect(ctx.enemySpeedMult).toBeCloseTo(1.10 * 1.20);
  });
  it('passes through credits/shard mults from selector only', () => {
    const ctx = createDifficultyContext({ selector: 'hard', chapterIndex: 3 });
    expect(ctx.startCreditsMult).toBe(0.9);
    expect(ctx.shardRewardMult).toBe(1.5);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm run test:engine -- DifficultyContext
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/difficulty/DifficultyContext.ts src/difficulty/__tests__/DifficultyContext.spec.ts
git commit -m "feat(difficulty): combined DifficultyContext factory"
```

### Task B17: `targetingSystem`

**Files:**
- Create: `src/engine/systems/targetingSystem.ts`
- Test: `src/engine/__tests__/targetingSystem.spec.ts`

The targeting system runs in the **read phase**. It picks a target per tower based on `targetPriority` and emits "fire intents" — actual damage application happens in the damage system using staged events.

- [ ] **Step 1: Implement targeting**

Create `src/engine/systems/targetingSystem.ts`:

```ts
import type { Tower } from '@/entities/Tower';
import type { Enemy } from '@/entities/Enemy';
import { distance } from '@/lib/vec2';
import { getTowerStat } from '@/entities/getStat';
import type { StatContext } from '@/entities/getStat';

export type FireIntent = {
  towerId: string;
  towerDefKind: string;
  projectileKind: string;
  damage: number;
  fromX: number;
  fromY: number;
  targetEnemyId: string;
  targetX: number;
  targetY: number;
};

export function pickTarget(
  tower: Tower,
  enemies: readonly Enemy[],
  ctx: StatContext,
): Enemy | null {
  const range = getTowerStat(
    { kind: 'tower', defKind: tower.defKind, base: tower.base },
    'range',
    ctx,
  );
  let best: Enemy | null = null;
  let bestKey = -Infinity;

  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.flying && tower.targets === 'ground') continue;
    if (!e.flying && tower.targets === 'flying') continue;
    const d = distance(tower, e);
    if (d > range) continue;

    let key: number;
    switch (tower.targetPriority) {
      case 'first':     key = e.distAlongPath; break;       // furthest along path
      case 'last':      key = -e.distAlongPath; break;       // shortest along path
      case 'strongest': key = e.hp; break;
      case 'weakest':   key = -e.hp; break;
      case 'closest':   key = -d; break;
    }
    if (key > bestKey) { bestKey = key; best = e; }
  }
  return best;
}

export function targetingSystem(
  towers: readonly Tower[],
  enemies: readonly Enemy[],
  ctx: StatContext,
  dt: number,
  out: FireIntent[],
): void {
  for (const t of towers) {
    if (!t.alive) continue;
    if (t.cooldown > 0) { t.cooldown = Math.max(0, t.cooldown - dt); continue; }
    const target = pickTarget(t, enemies, ctx);
    if (!target) continue;

    const damage = getTowerStat(
      { kind: 'tower', defKind: t.defKind, base: t.base },
      'damage',
      ctx,
    );
    const fireRate = getTowerStat(
      { kind: 'tower', defKind: t.defKind, base: t.base },
      'fireRate',
      ctx,
    );
    out.push({
      towerId: t.id,
      towerDefKind: t.defKind,
      projectileKind: t.projectileKind,
      damage,
      fromX: t.x,
      fromY: t.y,
      targetEnemyId: target.id,
      targetX: target.x,
      targetY: target.y,
    });
    t.cooldown = 1 / fireRate;
  }
}
```

- [ ] **Step 2: Test priorities**

Create `src/engine/__tests__/targetingSystem.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pickTarget, targetingSystem, type FireIntent } from '@/engine/systems/targetingSystem';
import { FirewallTower } from '@/entities/towers/FirewallTower';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import type { StatContext } from '@/entities/getStat';

const ctx: StatContext = { difficulty: { enemyHpMult: 1, enemySpeedMult: 1 }, effects: { towerStatMults: {} } };

function makeTower(priority: any): FirewallTower {
  return new FirewallTower({
    id: 't:1', defKind: 'firewall', level: 1,
    x: 5, y: 5, tileCoord: { col: 0, row: 0 },
    baseStats: { damage: 10, range: 5, fireRate: 1 },
    projectileKind: 'hitscan-bolt', targets: 'both', defaultTargetPriority: priority,
  });
}

function makeEnemy(id: string, x: number, y: number, hp: number, dist: number): WormEnemy {
  const e = new WormEnemy({
    id, defKind: 'worm',
    baseStats: { hp, speed: 1, armor: 0 },
    bounty: 1, flying: false, spawnerId: 'main',
  });
  e.x = x; e.y = y; e.distAlongPath = dist; e.hp = hp;
  return e;
}

describe('pickTarget', () => {
  const enemies = [
    makeEnemy('e:1', 6, 5, 10, 2),
    makeEnemy('e:2', 7, 5, 30, 5),
    makeEnemy('e:3', 4, 5, 20, 8),
  ];

  it('first = furthest along path within range', () => {
    expect(pickTarget(makeTower('first'), enemies, ctx)?.id).toBe('e:3');
  });
  it('last = least progressed along path within range', () => {
    expect(pickTarget(makeTower('last'), enemies, ctx)?.id).toBe('e:1');
  });
  it('strongest = highest hp', () => {
    expect(pickTarget(makeTower('strongest'), enemies, ctx)?.id).toBe('e:2');
  });
  it('weakest = lowest hp', () => {
    expect(pickTarget(makeTower('weakest'), enemies, ctx)?.id).toBe('e:1');
  });
  it('closest = smallest distance from tower', () => {
    expect(pickTarget(makeTower('closest'), enemies, ctx)?.id).toBe('e:1');
  });
  it('returns null when nothing in range', () => {
    const t = makeTower('first');
    t.base.range = 0.5;
    expect(pickTarget(t, enemies, ctx)).toBeNull();
  });
  it('skips dead enemies', () => {
    const dying = enemies.map((e) => Object.assign(e, {})); // shallow copies
    dying[0]!.alive = false;
    expect(pickTarget(makeTower('last'), dying, ctx)?.id).toBe('e:2');
  });
  it('respects ground/flying targets filter', () => {
    const t = makeTower('first');
    t.targets = 'flying';
    expect(pickTarget(t, enemies, ctx)).toBeNull();
  });
});

describe('targetingSystem', () => {
  it('emits a fire intent and sets cooldown', () => {
    const t = makeTower('first');
    const e = makeEnemy('e:1', 6, 5, 10, 1);
    const out: FireIntent[] = [];
    targetingSystem([t], [e], ctx, 1 / 60, out);
    expect(out).toHaveLength(1);
    expect(out[0]!.targetEnemyId).toBe('e:1');
    expect(t.cooldown).toBeCloseTo(1 / 1); // fireRate=1
  });
  it('does not emit while on cooldown', () => {
    const t = makeTower('first');
    const e = makeEnemy('e:1', 6, 5, 10, 1);
    t.cooldown = 0.5;
    const out: FireIntent[] = [];
    targetingSystem([t], [e], ctx, 1 / 60, out);
    expect(out).toHaveLength(0);
    expect(t.cooldown).toBeLessThan(0.5);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm run test:engine -- targetingSystem
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/engine/systems/targetingSystem.ts src/engine/__tests__/targetingSystem.spec.ts
git commit -m "feat(engine): targetingSystem with priority modes + ground/flying filter"
```

### Task B18: `movementSystem`

**Files:**
- Create: `src/engine/systems/movementSystem.ts`
- Test: `src/engine/__tests__/movementSystem.spec.ts`

- [ ] **Step 1: Implement movement**

Create `src/engine/systems/movementSystem.ts`:

```ts
import type { Enemy } from '@/entities/Enemy';
import { getEnemyStat } from '@/entities/getStat';
import { tickStatuses, totalDotDps } from '@/entities/StatusEffect';
import type { StatContext } from '@/entities/getStat';
import type { Path } from '@/world/Path';

export type LeakEvent = { enemyKind: string; enemyId: string };
export type DotTickEvent = {
  targetEnemyId: string;
  damage: number;
  attackerTowerId: string;
};

export function movementSystem(
  enemies: readonly Enemy[],
  path: Path,
  ctx: StatContext,
  dt: number,
  outLeaks: LeakEvent[],
  outDotTicks: DotTickEvent[],
): void {
  for (const e of enemies) {
    if (!e.alive) continue;

    // Status decay + DoT staging.
    const dotDps = totalDotDps(e.statuses);
    if (dotDps > 0) {
      // Attribute to the strongest dot's source (simplest: latest dot).
      const lastDot = [...e.statuses].reverse().find((s) => s.kind === 'dot');
      if (lastDot) {
        outDotTicks.push({
          targetEnemyId: e.id,
          damage: dotDps * dt,
          attackerTowerId: lastDot.appliedByTowerId,
        });
      }
    }
    tickStatuses(e.statuses, dt);

    const speed = getEnemyStat(
      { kind: 'enemy', defKind: e.defKind, base: e.base, statuses: e.statuses },
      'speed',
      ctx,
    );
    e.distAlongPath += speed * dt * path.tileSize;
    const xy = path.xyAtDistance(e.distAlongPath);
    e.x = xy.x;
    e.y = xy.y;

    if (path.reachedEnd(e.distAlongPath)) {
      e.alive = false;
      outLeaks.push({ enemyId: e.id, enemyKind: e.defKind });
    }
  }
}
```

- [ ] **Step 2: Test movement, status decay, DoT staging, leak**

Create `src/engine/__tests__/movementSystem.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { movementSystem, type LeakEvent, type DotTickEvent } from '@/engine/systems/movementSystem';
import { Path } from '@/world/Path';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import { freshStatus } from '@/entities/StatusEffect';
import type { StatContext } from '@/entities/getStat';

const ctx: StatContext = { difficulty: { enemyHpMult: 1, enemySpeedMult: 1 }, effects: { towerStatMults: {} } };
const path = new Path([{ col: 0, row: 0 }, { col: 5, row: 0 }], 1);

function worm(): WormEnemy {
  return new WormEnemy({
    id: 'e:1', defKind: 'worm',
    baseStats: { hp: 18, speed: 2, armor: 0 },
    bounty: 4, flying: false, spawnerId: 'main',
  });
}

describe('movementSystem', () => {
  it('advances enemy along path at speed', () => {
    const e = worm();
    const leaks: LeakEvent[] = [], dots: DotTickEvent[] = [];
    movementSystem([e], path, ctx, 0.5, leaks, dots);
    // 0.5 s × 2 tiles/s × tileSize=1 = 1 unit moved
    expect(e.distAlongPath).toBeCloseTo(1);
    expect(e.x).toBeCloseTo(1.5);
  });

  it('marks enemy dead and emits a leak when reaching end', () => {
    const e = worm();
    e.distAlongPath = path.totalLength - 0.01;
    const leaks: LeakEvent[] = [], dots: DotTickEvent[] = [];
    movementSystem([e], path, ctx, 1, leaks, dots);
    expect(e.alive).toBe(false);
    expect(leaks).toEqual([{ enemyId: 'e:1', enemyKind: 'worm' }]);
  });

  it('decays statuses and stages DoT damage', () => {
    const e = worm();
    e.statuses.push(freshStatus({ kind: 'dot', magnitude: 5, duration: 1, appliedByTowerId: 't:1' }));
    const leaks: LeakEvent[] = [], dots: DotTickEvent[] = [];
    movementSystem([e], path, ctx, 0.5, leaks, dots);
    expect(dots).toHaveLength(1);
    expect(dots[0]!.damage).toBeCloseTo(2.5);
    expect(e.statuses[0]!.remaining).toBeCloseTo(0.5);
  });

  it('skips dead enemies', () => {
    const e = worm();
    e.alive = false;
    const start = e.distAlongPath;
    movementSystem([e], path, ctx, 1, [], []);
    expect(e.distAlongPath).toBe(start);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm run test:engine -- movementSystem
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/engine/systems/movementSystem.ts src/engine/__tests__/movementSystem.spec.ts
git commit -m "feat(engine): movementSystem with status decay and leak detection"
```

### Task B19: `damageSystem` + cleanup

**Files:**
- Create: `src/engine/systems/damageSystem.ts`, `src/engine/systems/cleanupSystem.ts`
- Test: `src/engine/__tests__/damageSystem.spec.ts`, `cleanupSystem.spec.ts`

The damage system runs in the **write phase**. It applies staged `DamageEvent`s to enemies, updates `lastDamagedBy`, and clamps hp.

- [ ] **Step 1: Implement damageSystem**

Create `src/engine/systems/damageSystem.ts`:

```ts
import type { Enemy } from '@/entities/Enemy';
import type { EventBus, SimEventMap } from '@/engine/EventBus';

export type DamageEvent = {
  targetEnemyId: string;
  damage: number;
  attackerTowerId: string;
};

export function damageSystem(
  enemies: readonly Enemy[],
  events: readonly DamageEvent[],
  bus: EventBus<SimEventMap>,
): void {
  if (events.length === 0) return;
  // Build id→enemy map once.
  const byId = new Map<string, Enemy>();
  for (const e of enemies) byId.set(e.id, e);

  for (const ev of events) {
    const e = byId.get(ev.targetEnemyId);
    if (!e || !e.alive) continue;
    // Armor: flat reduction, minimum 1 damage.
    const dealt = Math.max(1, ev.damage - e.base.armor);
    e.hp -= dealt;
    e.lastDamagedBy = ev.attackerTowerId;
    if (e.hp <= 0) {
      e.alive = false;
      bus.emit('enemy-died', {
        enemyId: e.id,
        bounty: e.bounty,
        killedByTowerId: ev.attackerTowerId,
      });
    }
  }
}
```

- [ ] **Step 2: Test damage**

Create `src/engine/__tests__/damageSystem.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { damageSystem } from '@/engine/systems/damageSystem';
import { EventBus } from '@/engine/EventBus';
import { WormEnemy } from '@/entities/enemies/WormEnemy';

function worm(armor = 0): WormEnemy {
  return new WormEnemy({
    id: 'e:1', defKind: 'worm',
    baseStats: { hp: 20, speed: 1, armor },
    bounty: 4, flying: false, spawnerId: 'main',
  });
}

describe('damageSystem', () => {
  it('applies damage and updates lastDamagedBy', () => {
    const e = worm();
    const bus = new EventBus<any>();
    damageSystem([e], [{ targetEnemyId: 'e:1', damage: 5, attackerTowerId: 't:1' }], bus);
    expect(e.hp).toBe(15);
    expect(e.lastDamagedBy).toBe('t:1');
  });

  it('reduces by armor with floor of 1', () => {
    const e = worm(50);
    const bus = new EventBus<any>();
    damageSystem([e], [{ targetEnemyId: 'e:1', damage: 5, attackerTowerId: 't:1' }], bus);
    expect(e.hp).toBe(19);
  });

  it('emits enemy-died on lethal damage', () => {
    const e = worm();
    const bus = new EventBus<any>();
    const fn = vi.fn();
    bus.on('enemy-died', fn);
    damageSystem([e], [{ targetEnemyId: 'e:1', damage: 999, attackerTowerId: 't:1' }], bus);
    bus.flush();
    expect(e.alive).toBe(false);
    expect(fn).toHaveBeenCalledWith({ enemyId: 'e:1', bounty: 4, killedByTowerId: 't:1' });
  });

  it('ignores damage to unknown or dead enemies', () => {
    const e = worm(); e.alive = false;
    const bus = new EventBus<any>();
    damageSystem([e], [
      { targetEnemyId: 'e:1', damage: 10, attackerTowerId: 't:1' },
      { targetEnemyId: 'unknown', damage: 10, attackerTowerId: 't:2' },
    ], bus);
    expect(e.hp).toBe(20);
  });
});
```

- [ ] **Step 3: Implement cleanupSystem**

Create `src/engine/systems/cleanupSystem.ts`:

```ts
import type { Entity } from '@/entities/Entity';
import type { ObjectPool } from '@/engine/pool/ObjectPool';
import type { Projectile } from '@/entities/Projectile';

/**
 * Compact-in-place: drop !alive entries from the array.
 * For pooled entities, releases them back to the pool first.
 */
export function compactInPlace<T extends Entity>(arr: T[]): void {
  let write = 0;
  for (let read = 0; read < arr.length; read++) {
    const e = arr[read]!;
    if (e.alive) arr[write++] = e;
  }
  arr.length = write;
}

export function compactProjectilesAndRelease(
  arr: Projectile[],
  pool: ObjectPool<Projectile>,
): void {
  let write = 0;
  for (let read = 0; read < arr.length; read++) {
    const p = arr[read]!;
    if (p.alive) {
      arr[write++] = p;
    } else {
      pool.release(p);
    }
  }
  arr.length = write;
}
```

- [ ] **Step 4: Test cleanup**

Create `src/engine/__tests__/cleanupSystem.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { compactInPlace, compactProjectilesAndRelease } from '@/engine/systems/cleanupSystem';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import { HitscanProjectile } from '@/entities/projectiles/HitscanProjectile';
import { ObjectPool } from '@/engine/pool/ObjectPool';

function worm(id: string): WormEnemy {
  return new WormEnemy({
    id, defKind: 'worm',
    baseStats: { hp: 1, speed: 1, armor: 0 },
    bounty: 1, flying: false, spawnerId: 'main',
  });
}

describe('compactInPlace', () => {
  it('removes !alive entries while preserving order', () => {
    const a = worm('e:1'); const b = worm('e:2'); const c = worm('e:3');
    b.alive = false;
    const arr = [a, b, c];
    compactInPlace(arr);
    expect(arr.map((x) => x.id)).toEqual(['e:1', 'e:3']);
  });
});

describe('compactProjectilesAndRelease', () => {
  it('releases dead projectiles back to the pool', () => {
    const pool = new ObjectPool<HitscanProjectile>({
      create: () => new HitscanProjectile({ id: 'p:0', kind: 'projectile:hitscan-bolt', x: 0, y: 0, damage: 0, sourceTowerId: '', ttl: 0 }),
      reset: (p) => p.resetForPool(),
      initialSize: 0,
    });
    const a = pool.acquire(); a.alive = true;
    const b = pool.acquire(); b.alive = false;
    const arr = [a, b];
    compactProjectilesAndRelease(arr, pool);
    expect(arr).toEqual([a]);
    expect(pool.activeCount).toBe(1);
    expect(pool.freeCount).toBe(1);
  });
});
```

- [ ] **Step 5: Run tests**

```bash
npm run test:engine -- damageSystem cleanupSystem
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/engine/systems/damageSystem.ts src/engine/systems/cleanupSystem.ts src/engine/__tests__/damageSystem.spec.ts src/engine/__tests__/cleanupSystem.spec.ts
git commit -m "feat(engine): damageSystem (with armor + bus) + cleanupSystem (pool-aware)"
```

### Task B20: `Spawner` + `WaveDirector`

**Files:**
- Create: `src/world/Spawner.ts`, `src/world/WaveDirector.ts`
- Test: `src/world/__tests__/WaveDirector.spec.ts`

The spawner converts enemy-creation requests into actual `Enemy` instances. The wave director drives wave timing, group dependencies (`afterGroupId`, `delay`, `spacing`), and emits `wave-started`/`wave-cleared`.

- [ ] **Step 1: Implement Spawner**

Create `src/world/Spawner.ts`:

```ts
import type { EnemyKind } from '@/content/types';
import type { Enemy } from '@/entities/Enemy';
import { getEnemyDef } from '@/entities/registry';
import type { IdGen } from '@/lib/id';

export class Spawner {
  constructor(private idGen: IdGen) {}

  spawn(opts: { enemyKind: EnemyKind; spawnerId: string }): Enemy {
    const def = getEnemyDef(opts.enemyKind);
    const id = this.idGen('enemy');
    return new def.classRef({
      id,
      defKind: def.kind,
      baseStats: { hp: def.baseStats.hp, speed: def.baseStats.speed, armor: def.baseStats.armor },
      bounty: def.bounty,
      flying: def.flying,
      spawnerId: opts.spawnerId,
    });
  }
}
```

- [ ] **Step 2: Implement WaveDirector**

Create `src/world/WaveDirector.ts`:

```ts
import type { LevelDef, WaveDef, SpawnGroup } from '@/content/types';
import type { Spawner } from '@/world/Spawner';
import type { Enemy } from '@/entities/Enemy';
import type { EventBus, SimEventMap } from '@/engine/EventBus';

type GroupState = {
  group: SpawnGroup;
  spawnedCount: number;
  nextSpawnAt: number;     // sim seconds; relative to wave start
  finished: boolean;
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

    for (const gs of this.currentGroups) {
      if (gs.finished) continue;
      // afterGroupId: gate this group on the predecessor finishing.
      if (gs.group.afterGroupId) {
        const dep = this.currentGroups.find((x) => x.group.id === gs.group.afterGroupId);
        if (!dep || !dep.finished) continue;
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
```

- [ ] **Step 3: Test wave director**

Create `src/world/__tests__/WaveDirector.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { WaveDirector } from '@/world/WaveDirector';
import { Spawner } from '@/world/Spawner';
import { EventBus, type SimEventMap } from '@/engine/EventBus';
import { makeIdGen } from '@/lib/id';
import { registerEnemies, _resetRegistry } from '@/entities/registry';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import { TrojanEnemy } from '@/entities/enemies/TrojanEnemy';
import type { LevelDef } from '@/content/types';

const wormDef = {
  kind: 'worm' as const, displayName: 'Worm',
  baseStats: { hp: 18, speed: 2.6, armor: 0 }, bounty: 4, flying: false,
  classRef: WormEnemy,
};
const trojanDef = {
  kind: 'trojan' as const, displayName: 'Trojan',
  baseStats: { hp: 50, speed: 1.6, armor: 1 }, bounty: 9, flying: false,
  classRef: TrojanEnemy,
};

const level: LevelDef = {
  id: 'lvl-test', name: 'Test', chapter: 0,
  grid: { cols: 3, rows: 3, cells: [['path','path','path'],['path','path','path'],['path','path','path']] },
  spawners: [{ id: 'main', tile: { col: 0, row: 0 } }],
  path: [{ col: 0, row: 0 }, { col: 2, row: 0 }],
  startCredits: 100, startLives: 10,
  waves: [
    { delayBeforeStart: 0, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'worm', count: 3, spacing: 0.5, delay: 0 },
      { id: 'g2', spawnerId: 'main', enemyKind: 'trojan', count: 2, spacing: 1, delay: 0, afterGroupId: 'g1' },
    ]},
  ],
  starThresholds: { stars3: 10, stars2: 8, stars1: 1 },
};

beforeEach(() => { _resetRegistry(); registerEnemies([wormDef, trojanDef]); });

describe('WaveDirector', () => {
  it('spawns according to spacing and respects afterGroupId', () => {
    const bus = new EventBus<SimEventMap>();
    const dir = new WaveDirector(level, new Spawner(makeIdGen()), bus);

    dir.startWave(0, 0);
    expect(dir.waveStatus).toBe('running');

    let spawned: any[] = [];
    dir.tick(0, 0, [], spawned);
    expect(spawned.map(e => e.defKind)).toEqual(['worm']);  // delay=0, first spawn

    spawned = [];
    dir.tick(0.5, 0.5, [], spawned);
    expect(spawned.map(e => e.defKind)).toEqual(['worm']);

    spawned = [];
    dir.tick(1.0, 0.5, [], spawned);
    expect(spawned.map(e => e.defKind)).toEqual(['worm']);

    // g1 finished — g2 may now begin
    spawned = [];
    dir.tick(1.0, 0.0, [], spawned);
    expect(spawned.map(e => e.defKind)).toEqual(['trojan']);
  });

  it('emits wave-cleared when all groups spawned and board empty', () => {
    const bus = new EventBus<SimEventMap>();
    const dir = new WaveDirector(level, new Spawner(makeIdGen()), bus);
    let cleared = 0;
    bus.on('wave-cleared', () => cleared++);

    dir.startWave(0, 0);
    const allSpawned: any[] = [];
    for (let t = 0; t < 10; t += 0.25) dir.tick(t, 0.25, [], allSpawned);
    // All enemies "killed" (board empty in this test).
    dir.tick(10, 0.25, [], []);
    bus.flush();
    expect(cleared).toBe(1);
    expect(dir.waveStatus).toBe('cleared');
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm run test:engine -- WaveDirector
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/world/Spawner.ts src/world/WaveDirector.ts src/world/__tests__/WaveDirector.spec.ts
git commit -m "feat(world): Spawner + WaveDirector (afterGroupId, spawnerId, parallel groups)"
```

### Task B21: `World` factory + types

**Files:**
- Create: `src/world/World.ts`
- Test: `src/world/__tests__/World.spec.ts`

The world factory creates an empty, ready-to-tick `World` from a level + difficulty + seed. The shared-value `redrawTick` is injected (since the engine code is RN-free, it accepts a port).

- [ ] **Step 1: Implement World**

Create `src/world/World.ts`:

```ts
import type { LevelDef, Difficulty } from '@/content/types';
import type { Tower } from '@/entities/Tower';
import type { Enemy } from '@/entities/Enemy';
import type { Projectile } from '@/entities/Projectile';
import { BuildGrid } from '@/world/Grid';
import { Path } from '@/world/Path';
import { Spawner } from '@/world/Spawner';
import { WaveDirector } from '@/world/WaveDirector';
import { ObjectPool } from '@/engine/pool/ObjectPool';
import { EventBus, type SimEventMap } from '@/engine/EventBus';
import { SeededRng } from '@/engine/rng';
import { type DifficultyContext, createDifficultyContext } from '@/difficulty/DifficultyContext';
import { makeIdGen, type IdGen } from '@/lib/id';
import { HitscanProjectile } from '@/entities/projectiles/HitscanProjectile';
import { BallisticProjectile } from '@/entities/projectiles/BallisticProjectile';
import { AoEPulseProjectile } from '@/entities/projectiles/AoEPulseProjectile';
import type { GridCoord } from '@/lib/types';
import type { TileType } from '@/world/Grid';

export type RedrawPort = { bump(): void };

export type EffectsContext = {
  /** tower-stat multipliers (defKind → stat → mult). */
  towerStatMults: Partial<Record<string, Partial<Record<string, number>>>>;
  /** behavior unlocks (consulted by tower fire logic). */
  behaviors: {
    chainKill?: Partial<Record<string, number>>;     // tower defKind → chainCount
    slowFieldOnLogicBomb?: { duration: number; dotPerSecond?: number };
    iceLanceCrit?: { chance: number; mult: number };
  };
  /** Globals applied at match start. */
  globals: {
    startCreditsBonus: number;
    sellRebateRatio: number;       // default 0.7
    lifeRegenPerMinute: number;
  };
};

export const NULL_EFFECTS: EffectsContext = {
  towerStatMults: {},
  behaviors: {},
  globals: { startCreditsBonus: 0, sellRebateRatio: 0.7, lifeRegenPerMinute: 0 },
};

export type WorldStatus = 'preparing' | 'playing' | 'paused' | 'won' | 'lost';

export type World = {
  status: WorldStatus;
  time: number;
  lives: number;
  credits: number;
  selectedSpeed: 1 | 2 | 3;
  level: LevelDef;
  difficulty: DifficultyContext;
  effects: EffectsContext;
  path: Path;
  grid: BuildGrid;
  rng: SeededRng;
  idGen: IdGen;
  spawner: Spawner;
  waveDirector: WaveDirector;
  bus: EventBus<SimEventMap>;
  redraw: RedrawPort;
  entities: {
    towers: Tower[];
    enemies: Enemy[];
    projectiles: Projectile[];
  };
  pools: {
    hitscan: ObjectPool<HitscanProjectile>;
    ballistic: ObjectPool<BallisticProjectile>;
    aoe: ObjectPool<AoEPulseProjectile>;
  };
  staged: {
    damage: import('@/engine/systems/damageSystem').DamageEvent[];
    leaks: import('@/engine/systems/movementSystem').LeakEvent[];
    fireIntents: import('@/engine/systems/targetingSystem').FireIntent[];
  };
  selection: { towerId?: string; buildSpot?: GridCoord };
  matchSeed: number;
  /** Time since last life-regen tick, seconds (for the global tech node). */
  regenAccumulator: number;
};

export function createWorld(opts: {
  level: LevelDef;
  difficulty: Difficulty;
  effects?: EffectsContext;
  seed: number;
  redraw: RedrawPort;
  /** Optional ID generator (test injection). */
  idGen?: IdGen;
}): World {
  const effects = opts.effects ?? NULL_EFFECTS;
  const ctx = createDifficultyContext({
    selector: opts.difficulty,
    chapterIndex: opts.level.chapter,
  });

  const grid = new BuildGrid({
    cols: opts.level.grid.cols,
    rows: opts.level.grid.rows,
    cells: opts.level.grid.cells.map((row) => row.slice() as TileType[]),
  });
  const tileSize = 1; // engine uses tile units; renderer scales to pixels
  const path = new Path(opts.level.path, tileSize);
  const idGen = opts.idGen ?? makeIdGen();
  const bus = new EventBus<SimEventMap>();
  const spawner = new Spawner(idGen);

  const credits = Math.round(
    opts.level.startCredits * ctx.startCreditsMult + effects.globals.startCreditsBonus,
  );

  const world: World = {
    status: 'preparing',
    time: 0,
    lives: opts.level.startLives,
    credits,
    selectedSpeed: 1,
    level: opts.level,
    difficulty: ctx,
    effects,
    path,
    grid,
    rng: new SeededRng(opts.seed),
    idGen,
    spawner,
    waveDirector: new WaveDirector(opts.level, spawner, bus),
    bus,
    redraw: opts.redraw,
    entities: { towers: [], enemies: [], projectiles: [] },
    pools: {
      hitscan: new ObjectPool<HitscanProjectile>({
        create: () => new HitscanProjectile({ id: idGen('proj'), kind: 'projectile:hitscan-bolt', x: 0, y: 0, damage: 0, sourceTowerId: '', ttl: 0 }),
        reset: (p) => p.resetForPool(),
        initialSize: 16,
      }),
      ballistic: new ObjectPool<BallisticProjectile>({
        create: () => new BallisticProjectile({ id: idGen('proj'), kind: 'projectile:ballistic-pulse', x: 0, y: 0, damage: 0, sourceTowerId: '', ttl: 0 }),
        reset: (p) => p.resetForPool(),
        initialSize: 16,
      }),
      aoe: new ObjectPool<AoEPulseProjectile>({
        create: () => new AoEPulseProjectile({ id: idGen('proj'), kind: 'projectile:aoe-pulse', x: 0, y: 0, damage: 0, sourceTowerId: '', ttl: 0 }),
        reset: (p) => p.resetForPool(),
        initialSize: 8,
      }),
    },
    staged: { damage: [], leaks: [], fireIntents: [] },
    selection: {},
    matchSeed: opts.seed,
    regenAccumulator: 0,
  };

  return world;
}
```

- [ ] **Step 2: Smoke test factory**

Create `src/world/__tests__/World.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld } from '@/world/World';
import { _resetRegistry, registerEnemies, registerProjectiles, registerTowers } from '@/entities/registry';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import { TrojanEnemy } from '@/entities/enemies/TrojanEnemy';
import { DaemonEnemy } from '@/entities/enemies/DaemonEnemy';
import { RootkitEnemy } from '@/entities/enemies/RootkitEnemy';
import { FirewallTower } from '@/entities/towers/FirewallTower';
import { LogicBombTower } from '@/entities/towers/LogicBombTower';
import { ICELanceTower } from '@/entities/towers/ICELanceTower';
import { HitscanProjectile } from '@/entities/projectiles/HitscanProjectile';
import { BallisticProjectile } from '@/entities/projectiles/BallisticProjectile';
import { AoEPulseProjectile } from '@/entities/projectiles/AoEPulseProjectile';
import type { LevelDef } from '@/content/types';

beforeEach(() => {
  _resetRegistry();
  registerEnemies([
    { kind: 'worm',    displayName: 'Worm',    baseStats: { hp: 18,  speed: 2.6, armor: 0 }, bounty: 4,  flying: false, classRef: WormEnemy },
    { kind: 'trojan',  displayName: 'Trojan',  baseStats: { hp: 50,  speed: 1.6, armor: 1 }, bounty: 9,  flying: false, classRef: TrojanEnemy },
    { kind: 'daemon',  displayName: 'Daemon',  baseStats: { hp: 130, speed: 1.0, armor: 4 }, bounty: 18, flying: false, classRef: DaemonEnemy },
    { kind: 'rootkit', displayName: 'Rootkit', baseStats: { hp: 800, speed: 0.8, armor: 6 }, bounty: 80, flying: false, classRef: RootkitEnemy },
  ]);
  registerTowers([
    { kind: 'firewall',   displayName: 'Firewall',   baseStats: { range: 3.5, fireRate: 1.2, damage: 8 },  upgrades: [], cost: 50,  projectileKind: 'hitscan-bolt',    defaultTargetPriority: 'first', targets: 'both', classRef: FirewallTower },
    { kind: 'logic-bomb', displayName: 'Logic Bomb', baseStats: { range: 2.5, fireRate: 0.5, damage: 6 },  upgrades: [], cost: 90,  projectileKind: 'aoe-pulse',       defaultTargetPriority: 'strongest', targets: 'both', classRef: LogicBombTower },
    { kind: 'ice-lance',  displayName: 'ICE Lance',  baseStats: { range: 4.5, fireRate: 0.7, damage: 22 }, upgrades: [], cost: 140, projectileKind: 'ballistic-pulse', defaultTargetPriority: 'strongest', targets: 'both', classRef: ICELanceTower },
  ]);
  registerProjectiles([
    { kind: 'hitscan-bolt',    ttl: 0.05, classRef: HitscanProjectile },
    { kind: 'ballistic-pulse', ttl: 2.0,  speed: 6, classRef: BallisticProjectile },
    { kind: 'aoe-pulse',       ttl: 0.4,  classRef: AoEPulseProjectile },
  ]);
});

const level: LevelDef = {
  id: 'lvl-test', name: 'Test', chapter: 0,
  grid: { cols: 3, rows: 3, cells: [['path','path','path'],['buildable','buildable','buildable'],['path','path','path']] },
  spawners: [{ id: 'main', tile: { col: 0, row: 0 } }],
  path: [{ col: 0, row: 0 }, { col: 2, row: 0 }],
  startCredits: 100, startLives: 10,
  waves: [{ delayBeforeStart: 1, groups: [{ id: 'g1', spawnerId: 'main', enemyKind: 'worm', count: 3, spacing: 0.5, delay: 0 }] }],
  starThresholds: { stars3: 10, stars2: 8, stars1: 1 },
};

describe('createWorld', () => {
  it('initializes status, lives, credits with selector + globals applied', () => {
    const w = createWorld({
      level, difficulty: 'easy', seed: 1,
      redraw: { bump: () => {} },
    });
    expect(w.status).toBe('preparing');
    expect(w.lives).toBe(10);
    // easy: startCredits ×1.15 = 115
    expect(w.credits).toBe(115);
  });
  it('respects effects.globals.startCreditsBonus', () => {
    const w = createWorld({
      level, difficulty: 'normal', seed: 1,
      effects: {
        towerStatMults: {},
        behaviors: {},
        globals: { startCreditsBonus: 50, sellRebateRatio: 0.7, lifeRegenPerMinute: 0 },
      },
      redraw: { bump: () => {} },
    });
    expect(w.credits).toBe(150);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm run test:engine -- World
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/world/World.ts src/world/__tests__/World.spec.ts
git commit -m "feat(world): World factory wires grid, path, pools, director, RNG"
```

### Task B22: `Engine` — fixed-timestep simStep + control surface

**Files:**
- Create: `src/engine/time.ts`, `src/engine/Engine.ts`
- Test: `src/engine/__tests__/Engine.spec.ts`

The `Engine` exposes a `simStep(dt)` for tests, plus `start(now)` / `stop()` / `setSpeed()` / `pause()` / `resume()` for the host. The actual `requestAnimationFrame` driver is injected as a `Clock` port so tests can drive it manually.

- [ ] **Step 1: Constants**

Create `src/engine/time.ts`:

```ts
export const FIXED_DT = 1 / 60;          // 16.67 ms simulation step
export const MAX_REAL_DT = 0.033;        // clamp big stalls (e.g. tab switch)
export const MAX_STEPS_PER_FRAME = 5;
```

- [ ] **Step 2: Implement Engine**

Create `src/engine/Engine.ts`:

```ts
import type { World } from '@/world/World';
import { targetingSystem } from '@/engine/systems/targetingSystem';
import { movementSystem } from '@/engine/systems/movementSystem';
import { damageSystem, type DamageEvent } from '@/engine/systems/damageSystem';
import { compactInPlace, compactProjectilesAndRelease } from '@/engine/systems/cleanupSystem';
import { FIXED_DT, MAX_REAL_DT, MAX_STEPS_PER_FRAME } from '@/engine/time';
import { clamp } from '@/lib/lerp';
import { distance } from '@/lib/vec2';

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

    // 1. Wave director: spawn enemies, emit wave events.
    const newSpawns: typeof w.entities.enemies = [];
    w.waveDirector.tick(w.time, dt, w.entities.enemies, newSpawns);
    for (const e of newSpawns) {
      // Apply difficulty mult on hp at spawn (so maxHp reflects displayable bar).
      e.maxHp = e.base.hp * w.difficulty.enemyHpMult;
      e.hp = e.maxHp;
      // Place at path start.
      e.distAlongPath = 0;
      const xy = w.path.xyAtDistance(0);
      e.x = xy.x; e.y = xy.y;
      w.entities.enemies.push(e);
    }

    // 2. Read phase: targeting → fireIntents.
    const ctx = { difficulty: w.difficulty, effects: { towerStatMults: w.effects.towerStatMults } };
    w.staged.fireIntents.length = 0;
    targetingSystem(w.entities.towers, w.entities.enemies, ctx, dt, w.staged.fireIntents);

    // 3. Convert fire intents into damage events / projectiles.
    w.staged.damage.length = 0;
    for (const intent of w.staged.fireIntents) {
      // Hitscan: instant damage, no projectile entity persisted.
      if (intent.projectileKind === 'hitscan-bolt') {
        let damage = intent.damage;
        // ICE Lance crit + freeze are not on hitscan; chain on Firewall happens in damageSystem hook.
        w.staged.damage.push({
          targetEnemyId: intent.targetEnemyId,
          damage,
          attackerTowerId: intent.towerId,
        });
      } else if (intent.projectileKind === 'aoe-pulse') {
        // Spawn an AoE pulse at target.
        const p = w.pools.aoe.acquire();
        p.alive = true;
        p.x = intent.targetX; p.y = intent.targetY;
        p.damage = intent.damage; p.sourceTowerId = intent.towerId;
        p.ttl = 0.4; p.radius = 1.5; p.currentRadius = 0;
        p.hitEnemyIds.clear();
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
      }
    }

    // 4. Movement (read phase) — also stages DoT damage and leaks.
    const dotEvents: DamageEvent[] = [];
    movementSystem(w.entities.enemies, w.path, ctx, dt, w.staged.leaks, dotEvents);

    // 5. Projectile updates (fold into damage stage).
    for (const p of w.entities.projectiles) {
      if (!p.alive) continue;
      p.ttl -= dt;
      if (p.ttl <= 0) { p.alive = false; continue; }
      if (p.kind === 'projectile:ballistic-pulse') {
        const bp = p as import('@/entities/projectiles/BallisticProjectile').BallisticProjectile;
        bp.x += bp.vx * dt; bp.y += bp.vy * dt;
        const target = w.entities.enemies.find((e) => e.id === bp.targetEnemyId && e.alive);
        if (target) {
          const d = distance(bp, target);
          if (d < 0.4) {
            // Apply ICE Lance freeze + crit if eligible (source tower defKind == 'ice-lance').
            const sourceTower = w.entities.towers.find((t) => t.id === bp.sourceTowerId);
            let dmg = bp.damage;
            if (sourceTower?.defKind === 'ice-lance' && w.effects.behaviors.iceLanceCrit) {
              if (w.rng.chance(w.effects.behaviors.iceLanceCrit.chance)) dmg *= w.effects.behaviors.iceLanceCrit.mult;
            }
            w.staged.damage.push({ targetEnemyId: target.id, damage: dmg, attackerTowerId: bp.sourceTowerId });
            if (sourceTower?.defKind === 'ice-lance') {
              const ice = sourceTower as import('@/entities/towers/ICELanceTower').ICELanceTower;
              target.statuses.push({
                kind: 'freeze', magnitude: 1, duration: ice.freezeDuration, remaining: ice.freezeDuration, appliedByTowerId: ice.id,
              });
            }
            bp.alive = false;
          }
        } else {
          bp.alive = false;
        }
      } else if (p.kind === 'projectile:aoe-pulse') {
        const ap = p as import('@/entities/projectiles/AoEPulseProjectile').AoEPulseProjectile;
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
    }

    // 6. Write phase: apply staged damage events.
    for (const ev of dotEvents) w.staged.damage.push(ev);
    damageSystem(w.entities.enemies, w.staged.damage, w.bus);

    // 6b. Firewall chain-on-kill (tech effect). For each lethal hitscan damage
    // event from a Firewall, if chain is unlocked, deal the same damage to the
    // nearest other in-range enemy. Repeat up to chainCount-1 additional hits.
    const chainCounts = w.effects.behaviors.chainKill;
    if (chainCounts && chainCounts['firewall']) {
      const totalChain = chainCounts['firewall']!;
      const chainEvents: typeof w.staged.damage = [];
      const alreadyHit = new Set<string>();
      for (const ev of w.staged.damage) {
        if (ev.damage <= 0) continue;
        const tower = w.entities.towers.find((t) => t.id === ev.attackerTowerId);
        if (!tower || tower.defKind !== 'firewall') continue;
        const dead = w.entities.enemies.find((e) => e.id === ev.targetEnemyId && !e.alive && e.hp <= 0);
        if (!dead) continue;
        let cursor = { x: dead.x, y: dead.y };
        let lastTowerId = tower.id;
        for (let i = 1; i < totalChain; i++) {
          let bestId: string | null = null;
          let bestDist = Infinity;
          for (const e of w.entities.enemies) {
            if (!e.alive || alreadyHit.has(e.id) || e.id === ev.targetEnemyId) continue;
            const d = Math.hypot(e.x - tower.x, e.y - tower.y);
            if (d > tower.base.range) continue;
            const dToCursor = Math.hypot(e.x - cursor.x, e.y - cursor.y);
            if (dToCursor < bestDist) { bestDist = dToCursor; bestId = e.id; }
          }
          if (!bestId) break;
          alreadyHit.add(bestId);
          chainEvents.push({ targetEnemyId: bestId, damage: ev.damage, attackerTowerId: lastTowerId });
          const next = w.entities.enemies.find((e) => e.id === bestId);
          if (next) cursor = { x: next.x, y: next.y };
        }
      }
      if (chainEvents.length > 0) {
        damageSystem(w.entities.enemies, chainEvents, w.bus);
      }
    }

    // 7. Process leaks (lives, lose check).
    for (const leak of w.staged.leaks) {
      w.lives -= 1;
      w.bus.emit('life-lost', { enemyKind: leak.enemyKind });
      w.bus.emit('lives-changed', { lives: w.lives });
    }
    w.staged.leaks.length = 0;

    // 8. Bounty payouts on enemy-died (subscribe-once: built into damageSystem already firing).
    // We listen via the bus and credit accordingly. To avoid a separate subscriber, scan dead enemies.
    for (const e of w.entities.enemies) {
      if (!e.alive && e.hp <= 0 && e.lastDamagedBy) {
        // Avoid double-pay: pay once, then null lastDamagedBy.
        if (e.bounty > 0) {
          w.credits += e.bounty;
          w.bus.emit('credits-changed', { credits: w.credits });
          e.bounty = 0;
        }
      }
    }

    // 9. Compact arrays (release pool entries).
    compactInPlace(w.entities.enemies);
    compactInPlace(w.entities.towers);
    compactProjectilesAndRelease(w.entities.projectiles, {
      release: (p: any) => {
        if (p.kind === 'projectile:hitscan-bolt') w.pools.hitscan.release(p);
        else if (p.kind === 'projectile:ballistic-pulse') w.pools.ballistic.release(p);
        else if (p.kind === 'projectile:aoe-pulse') w.pools.aoe.release(p);
      },
    } as any);

    // 10. Life regen tech node.
    if (w.effects.globals.lifeRegenPerMinute > 0) {
      w.regenAccumulator += dt;
      const period = 60 / w.effects.globals.lifeRegenPerMinute;
      while (w.regenAccumulator >= period) {
        w.regenAccumulator -= period;
        if (w.lives < w.level.startLives) {
          w.lives += 1;
          w.bus.emit('lives-changed', { lives: w.lives });
        }
      }
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
      // Stars resolved in higher-level results computation; engine reports raw outcome.
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
```

> Note: this Engine intentionally folds projectile updates inline rather than extracting a separate projectileSystem — projectile logic is tightly coupled to damage staging. If a later refactor wants extraction, the cohesion is the seam to split on.

- [ ] **Step 3: Test simStep determinism on a hand-built scenario**

Create `src/engine/__tests__/Engine.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Engine } from '@/engine/Engine';
import { createWorld, NULL_EFFECTS } from '@/world/World';
import { _resetRegistry, registerEnemies, registerProjectiles, registerTowers } from '@/entities/registry';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import { TrojanEnemy } from '@/entities/enemies/TrojanEnemy';
import { DaemonEnemy } from '@/entities/enemies/DaemonEnemy';
import { RootkitEnemy } from '@/entities/enemies/RootkitEnemy';
import { FirewallTower } from '@/entities/towers/FirewallTower';
import { LogicBombTower } from '@/entities/towers/LogicBombTower';
import { ICELanceTower } from '@/entities/towers/ICELanceTower';
import { HitscanProjectile } from '@/entities/projectiles/HitscanProjectile';
import { BallisticProjectile } from '@/entities/projectiles/BallisticProjectile';
import { AoEPulseProjectile } from '@/entities/projectiles/AoEPulseProjectile';
import type { LevelDef } from '@/content/types';

beforeEach(() => {
  _resetRegistry();
  registerEnemies([
    { kind: 'worm',    displayName: 'Worm',    baseStats: { hp: 18,  speed: 2.0, armor: 0 }, bounty: 4,  flying: false, classRef: WormEnemy },
    { kind: 'trojan',  displayName: 'Trojan',  baseStats: { hp: 50,  speed: 1.6, armor: 1 }, bounty: 9,  flying: false, classRef: TrojanEnemy },
    { kind: 'daemon',  displayName: 'Daemon',  baseStats: { hp: 130, speed: 1.0, armor: 4 }, bounty: 18, flying: false, classRef: DaemonEnemy },
    { kind: 'rootkit', displayName: 'Rootkit', baseStats: { hp: 800, speed: 0.8, armor: 6 }, bounty: 80, flying: false, classRef: RootkitEnemy },
  ]);
  registerTowers([
    { kind: 'firewall',   displayName: 'Firewall',   baseStats: { range: 5,    fireRate: 5,   damage: 999 }, upgrades: [], cost: 50,  projectileKind: 'hitscan-bolt',    defaultTargetPriority: 'first', targets: 'both', classRef: FirewallTower },
    { kind: 'logic-bomb', displayName: 'Logic Bomb', baseStats: { range: 2.5,  fireRate: 0.5, damage: 6   }, upgrades: [], cost: 90,  projectileKind: 'aoe-pulse',       defaultTargetPriority: 'strongest', targets: 'both', classRef: LogicBombTower },
    { kind: 'ice-lance',  displayName: 'ICE Lance',  baseStats: { range: 4.5,  fireRate: 0.7, damage: 22  }, upgrades: [], cost: 140, projectileKind: 'ballistic-pulse', defaultTargetPriority: 'strongest', targets: 'both', classRef: ICELanceTower },
  ]);
  registerProjectiles([
    { kind: 'hitscan-bolt',    ttl: 0.05, classRef: HitscanProjectile },
    { kind: 'ballistic-pulse', ttl: 2.0,  speed: 6, classRef: BallisticProjectile },
    { kind: 'aoe-pulse',       ttl: 0.4,  classRef: AoEPulseProjectile },
  ]);
});

const level: LevelDef = {
  id: 'lvl-test', name: 'Test', chapter: 0,
  grid: { cols: 5, rows: 1, cells: [['path','path','path','path','path']] },
  spawners: [{ id: 'main', tile: { col: 0, row: 0 } }],
  path: [{ col: 0, row: 0 }, { col: 4, row: 0 }],
  startCredits: 200, startLives: 5,
  waves: [{ delayBeforeStart: 0, groups: [{ id: 'g1', spawnerId: 'main', enemyKind: 'worm', count: 2, spacing: 0.5, delay: 0 }] }],
  starThresholds: { stars3: 5, stars2: 4, stars1: 1 },
};

const fakeClock = { now: () => 0, schedule: () => () => {} };

describe('Engine.simStep', () => {
  it('a worm reaches the end without towers and emits life-lost + match-lost', () => {
    const w = createWorld({ level, difficulty: 'normal', seed: 1, redraw: { bump: () => {} } });
    const engine = new Engine(w, fakeClock);
    engine.startNextWave();
    let lifeLost = 0, matchLost = 0;
    w.bus.on('life-lost', () => lifeLost++);
    w.bus.on('match-lost', () => matchLost++);
    for (let i = 0; i < 60 * 10; i++) {
      engine.simStep(1 / 60);
      if (w.status === 'lost') break;
    }
    expect(lifeLost).toBeGreaterThanOrEqual(1);
    expect(matchLost).toBe(1);
  });

  it('a powerful firewall placed mid-path kills both worms — match won', () => {
    const w = createWorld({ level, difficulty: 'normal', seed: 1, redraw: { bump: () => {} } });
    // Place a Firewall at world (2.5, 0.5) — center of tile (2, 0).
    const fw = new FirewallTower({
      id: w.idGen('tower'), defKind: 'firewall', level: 1,
      x: 2.5, y: 0.5, tileCoord: { col: 2, row: 0 },
      baseStats: { range: 5, fireRate: 5, damage: 999 },
      projectileKind: 'hitscan-bolt', targets: 'both', defaultTargetPriority: 'first',
    });
    w.entities.towers.push(fw);
    const engine = new Engine(w, fakeClock);
    engine.startNextWave();
    for (let i = 0; i < 60 * 10; i++) {
      engine.simStep(1 / 60);
      if (w.status === 'won' || w.status === 'lost') break;
    }
    expect(w.status).toBe('won');
    expect(w.lives).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm run test:engine -- Engine
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/time.ts src/engine/Engine.ts src/engine/__tests__/Engine.spec.ts
git commit -m "feat(engine): fixed-timestep simStep + projectile resolution + win/lose"
```

### Task B23: Determinism integration test (100 seeds)

**Files:**
- Test: `src/engine/__tests__/determinism.spec.ts`

- [ ] **Step 1: Write the test**

Create `src/engine/__tests__/determinism.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Engine } from '@/engine/Engine';
import { createWorld } from '@/world/World';
import { _resetRegistry, registerEnemies, registerProjectiles, registerTowers } from '@/entities/registry';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import { TrojanEnemy } from '@/entities/enemies/TrojanEnemy';
import { DaemonEnemy } from '@/entities/enemies/DaemonEnemy';
import { RootkitEnemy } from '@/entities/enemies/RootkitEnemy';
import { FirewallTower } from '@/entities/towers/FirewallTower';
import { LogicBombTower } from '@/entities/towers/LogicBombTower';
import { ICELanceTower } from '@/entities/towers/ICELanceTower';
import { HitscanProjectile } from '@/entities/projectiles/HitscanProjectile';
import { BallisticProjectile } from '@/entities/projectiles/BallisticProjectile';
import { AoEPulseProjectile } from '@/entities/projectiles/AoEPulseProjectile';
import type { LevelDef } from '@/content/types';

beforeEach(() => {
  _resetRegistry();
  registerEnemies([
    { kind: 'worm',    displayName: 'Worm',    baseStats: { hp: 18,  speed: 2.0, armor: 0 }, bounty: 4,  flying: false, classRef: WormEnemy },
    { kind: 'trojan',  displayName: 'Trojan',  baseStats: { hp: 50,  speed: 1.6, armor: 1 }, bounty: 9,  flying: false, classRef: TrojanEnemy },
    { kind: 'daemon',  displayName: 'Daemon',  baseStats: { hp: 130, speed: 1.0, armor: 4 }, bounty: 18, flying: false, classRef: DaemonEnemy },
    { kind: 'rootkit', displayName: 'Rootkit', baseStats: { hp: 800, speed: 0.8, armor: 6 }, bounty: 80, flying: false, classRef: RootkitEnemy },
  ]);
  registerTowers([
    { kind: 'firewall',   displayName: 'Firewall',   baseStats: { range: 3.5, fireRate: 1.2, damage: 8 },  upgrades: [], cost: 50,  projectileKind: 'hitscan-bolt',    defaultTargetPriority: 'first', targets: 'both', classRef: FirewallTower },
    { kind: 'logic-bomb', displayName: 'Logic Bomb', baseStats: { range: 2.5, fireRate: 0.5, damage: 6 },  upgrades: [], cost: 90,  projectileKind: 'aoe-pulse',       defaultTargetPriority: 'strongest', targets: 'both', classRef: LogicBombTower },
    { kind: 'ice-lance',  displayName: 'ICE Lance',  baseStats: { range: 4.5, fireRate: 0.7, damage: 22 }, upgrades: [], cost: 140, projectileKind: 'ballistic-pulse', defaultTargetPriority: 'strongest', targets: 'both', classRef: ICELanceTower },
  ]);
  registerProjectiles([
    { kind: 'hitscan-bolt',    ttl: 0.05, classRef: HitscanProjectile },
    { kind: 'ballistic-pulse', ttl: 2.0,  speed: 6, classRef: BallisticProjectile },
    { kind: 'aoe-pulse',       ttl: 0.4,  classRef: AoEPulseProjectile },
  ]);
});

const level: LevelDef = {
  id: 'lvl-det', name: 'Det', chapter: 0,
  grid: { cols: 6, rows: 1, cells: [['path','path','path','path','path','path']] },
  spawners: [{ id: 'main', tile: { col: 0, row: 0 } }],
  path: [{ col: 0, row: 0 }, { col: 5, row: 0 }],
  startCredits: 200, startLives: 5,
  waves: [{ delayBeforeStart: 0, groups: [
    { id: 'g1', spawnerId: 'main', enemyKind: 'worm',    count: 4, spacing: 0.4, delay: 0 },
    { id: 'g2', spawnerId: 'main', enemyKind: 'trojan',  count: 2, spacing: 0.6, delay: 0, afterGroupId: 'g1' },
  ]}],
  starThresholds: { stars3: 5, stars2: 4, stars1: 1 },
};

function runMatch(seed: number) {
  const w = createWorld({ level, difficulty: 'normal', seed, redraw: { bump: () => {} } });
  // Place an ICE Lance at column 3 (to exercise ballistic + crit + freeze paths if effects on).
  w.entities.towers.push(new ICELanceTower({
    id: w.idGen('tower'), defKind: 'ice-lance', level: 1,
    x: 3.5, y: 0.5, tileCoord: { col: 3, row: 0 },
    baseStats: { range: 4.5, fireRate: 0.7, damage: 22 },
    projectileKind: 'ballistic-pulse', targets: 'both', defaultTargetPriority: 'strongest',
  }));
  const engine = new Engine(w, { now: () => 0, schedule: () => () => {} });
  engine.startNextWave();
  for (let i = 0; i < 60 * 30; i++) {
    engine.simStep(1 / 60);
    if (w.status !== 'playing') break;
  }
  return {
    status: w.status,
    lives: w.lives,
    credits: w.credits,
    waveCleared: w.waveDirector.waveIndex,
    enemiesAlive: w.entities.enemies.filter((e) => e.alive).length,
  };
}

describe('determinism (100 seeds)', () => {
  it('two runs of the same (level, difficulty, seed) produce identical end state', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const a = runMatch(seed);
      const b = runMatch(seed);
      expect(b).toEqual(a);
    }
  }, 30_000);
});
```

- [ ] **Step 2: Run tests**

```bash
npm run test:engine -- determinism
```

Expected: all green. Should run in well under 5 seconds.

- [ ] **Step 3: Commit**

```bash
git add src/engine/__tests__/determinism.spec.ts
git commit -m "test(engine): determinism across 100 seeds"
```

### Task B24: Phase B checkpoint

- [ ] **Step 1: Run the full engine suite and confirm < 2 s**

```bash
npm run test:engine
```

Expected: all green; total runtime < 2 s in normal mode (the 100-seed determinism spec is the only multi-second one and is cheap because the level is small).

- [ ] **Step 2: Run the engine TS pass**

```bash
npm run lint:tsc:engine
```

Expected: no errors.

- [ ] **Step 3: Tag the checkpoint**

```bash
git tag phase-b-engine-complete
git log --oneline -10
```

Stop here for review. The headless game is fully simulated end-to-end with passing tests and 100-seed determinism. Phase C will plug it into save data, the tech tree, and content catalogs.

---

## Phase C — Persistence, Tech Tree, Content Catalogs

End-of-phase checkpoint: the engine runs against real content (the actual 3 towers, 4 enemies, 10-wave level 1), save data round-trips through AsyncStorage with an atomic two-key swap, and unlocked tech nodes produce a measurable in-engine effect.

### Task C1: Save schema + blank save factory

**Files:**
- Create: `src/meta/schema.ts`

- [ ] **Step 1: Define save schema**

Create `src/meta/schema.ts`:

```ts
import type { Difficulty } from '@/content/types';

export type StarCount = 0 | 1 | 2 | 3;

export type LevelProgress = {
  bestStarsByDifficulty: Partial<Record<Difficulty, StarCount>>;
  bestWaveReached: number;
  cleared: boolean;
  shardsAwardedFor: Difficulty[];
};

export type SaveSettings = {
  audioMaster: number;          // 0..1
  sfx: number;                  // 0..1
  music: number;                // 0..1
  difficultyDefault: Difficulty;
  tutorialSeen: boolean;
};

export type SaveDataV1 = {
  profile: { createdAt: number; lastPlayedAt: number };
  campaign: Record<string, LevelProgress>;
  meta: {
    shards: number;
    techTree: Record<string, number>;     // nodeId → tier (0 = locked)
  };
  settings: SaveSettings;
};

export type PersistedBlobV1 = {
  version: 1;
  data: SaveDataV1;
};

export const CURRENT_VERSION = 1 as const;

export function blankSaveDataV1(now: number = Date.now()): SaveDataV1 {
  return {
    profile: { createdAt: now, lastPlayedAt: now },
    campaign: {},
    meta: { shards: 0, techTree: {} },
    settings: {
      audioMaster: 1.0,
      sfx: 1.0,
      music: 0.7,
      difficultyDefault: 'normal',
      tutorialSeen: false,
    },
  };
}

export type SaveDataLatest = SaveDataV1;
```

- [ ] **Step 2: Commit**

```bash
git add src/meta/schema.ts
git commit -m "feat(meta): SaveDataV1 schema and blank save factory"
```

### Task C2: Migration runner

**Files:**
- Create: `src/meta/migrations/index.ts`
- Test: `src/meta/migrations/__tests__/migrations.spec.ts`

The migration runner is a sequence of pure `(vN) → (vN+1)` functions. v1 is the initial schema; the runner is built future-proof so v2 migrations later are trivial to add.

- [ ] **Step 1: Implement runMigrations**

Create `src/meta/migrations/index.ts`:

```ts
import { CURRENT_VERSION, type SaveDataLatest } from '@/meta/schema';

export type Migration = {
  from: number;
  to: number;
  migrate: (data: unknown) => unknown;
};

export const MIGRATIONS: Migration[] = [
  // Future entries:
  // { from: 1, to: 2, migrate: (d) => /* transform */ d as unknown },
];

export function runMigrations(blob: { version: number; data: unknown }): SaveDataLatest {
  let { version, data } = blob;
  for (const m of MIGRATIONS) {
    if (version === m.from) {
      data = m.migrate(data);
      version = m.to;
    }
  }
  if (version !== CURRENT_VERSION) {
    throw new Error(`No migration path from v${version} to v${CURRENT_VERSION}`);
  }
  return data as SaveDataLatest;
}
```

- [ ] **Step 2: Test**

Create `src/meta/migrations/__tests__/migrations.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { runMigrations } from '@/meta/migrations';
import { blankSaveDataV1, CURRENT_VERSION } from '@/meta/schema';

describe('runMigrations', () => {
  it('passes v1 through unchanged', () => {
    const data = blankSaveDataV1(123);
    const out = runMigrations({ version: 1, data });
    expect(out).toEqual(data);
  });
  it('throws when no migration path exists', () => {
    expect(() => runMigrations({ version: 999, data: {} })).toThrow(/No migration path/);
  });
  it('reports the latest version constant', () => {
    expect(CURRENT_VERSION).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm run test:engine -- migrations
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/meta/migrations/index.ts src/meta/migrations/__tests__/migrations.spec.ts
git commit -m "feat(meta): migration runner (v1 baseline)"
```

### Task C3: `SaveStore` (AsyncStorage facade with atomic write)

**Files:**
- Create: `src/meta/SaveStore.ts`
- Test: `src/meta/__tests__/SaveStore.spec.ts`

`SaveStore` is RN-light: it depends only on a typed `KeyValueStore` port. Tests inject an in-memory implementation; the RN side wires AsyncStorage via a thin adapter (added in Phase D).

- [ ] **Step 1: Implement SaveStore**

Create `src/meta/SaveStore.ts`:

```ts
import { type SaveDataLatest, blankSaveDataV1, CURRENT_VERSION, type PersistedBlobV1 } from '@/meta/schema';
import { runMigrations } from '@/meta/migrations';
import { debounce } from '@/lib/debounce';

export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const KEY_MAIN = 'tower-gemax/save/v1';
const KEY_TMP  = 'tower-gemax/save/v1.tmp';

export class SaveStore {
  private cache: SaveDataLatest | null = null;
  private flushDebounced = debounce(() => { void this.flush(); }, 250);

  constructor(private kv: KeyValueStore) {}

  async load(): Promise<SaveDataLatest> {
    const main = await this.tryParse(await this.kv.getItem(KEY_MAIN));
    if (main) { this.cache = runMigrations(main); return this.cache; }
    // Recover from tmp if main is missing/corrupt.
    const tmp = await this.tryParse(await this.kv.getItem(KEY_TMP));
    if (tmp) {
      this.cache = runMigrations(tmp);
      await this.flush();         // rewrite main from tmp
      return this.cache;
    }
    this.cache = blankSaveDataV1();
    await this.flush();           // persist initial save
    return this.cache;
  }

  current(): SaveDataLatest {
    if (!this.cache) throw new Error('SaveStore.load() must be called first');
    return this.cache;
  }

  /** Read-modify-write the cache; debounce-persist. */
  update(fn: (draft: SaveDataLatest) => void): void {
    if (!this.cache) throw new Error('SaveStore.load() must be called first');
    fn(this.cache);
    this.cache.profile.lastPlayedAt = Date.now();
    this.flushDebounced();
  }

  /** Force immediate persistence (e.g. on app background). */
  async flush(): Promise<void> {
    if (!this.cache) return;
    const blob: PersistedBlobV1 = { version: CURRENT_VERSION, data: this.cache };
    const json = JSON.stringify(blob);
    await this.kv.setItem(KEY_TMP, json);
    await this.kv.setItem(KEY_MAIN, json);
    await this.kv.removeItem(KEY_TMP);
  }

  async reset(): Promise<void> {
    this.cache = blankSaveDataV1();
    await this.flush();
  }

  private async tryParse(raw: string | null): Promise<{ version: number; data: unknown } | null> {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.version === 'number' && parsed?.data) return parsed;
      return null;
    } catch {
      return null;
    }
  }
}

export class MemoryKv implements KeyValueStore {
  private map = new Map<string, string>();
  async getItem(k: string) { return this.map.get(k) ?? null; }
  async setItem(k: string, v: string) { this.map.set(k, v); }
  async removeItem(k: string) { this.map.delete(k); }
}
```

- [ ] **Step 2: Test**

Create `src/meta/__tests__/SaveStore.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SaveStore, MemoryKv } from '@/meta/SaveStore';

describe('SaveStore', () => {
  it('initializes a blank save on first load and persists it', async () => {
    const kv = new MemoryKv();
    const store = new SaveStore(kv);
    const data = await store.load();
    expect(data.meta.shards).toBe(0);
    expect(await kv.getItem('tower-gemax/save/v1')).toBeTruthy();
  });

  it('round-trips a mutation', async () => {
    const kv = new MemoryKv();
    const store = new SaveStore(kv);
    await store.load();
    store.update((d) => { d.meta.shards = 50; });
    await store.flush();

    const store2 = new SaveStore(kv);
    const data = await store2.load();
    expect(data.meta.shards).toBe(50);
  });

  it('recovers from a corrupt main blob using the tmp', async () => {
    const kv = new MemoryKv();
    // Seed: main is corrupt, tmp is valid v1.
    await kv.setItem('tower-gemax/save/v1', 'NOT JSON');
    await kv.setItem('tower-gemax/save/v1.tmp', JSON.stringify({
      version: 1,
      data: { profile: { createdAt: 0, lastPlayedAt: 0 }, campaign: {}, meta: { shards: 99, techTree: {} },
              settings: { audioMaster: 1, sfx: 1, music: 1, difficultyDefault: 'normal', tutorialSeen: true } },
    }));
    const store = new SaveStore(kv);
    const data = await store.load();
    expect(data.meta.shards).toBe(99);
    // tmp is rewritten as part of flush.
    expect(await kv.getItem('tower-gemax/save/v1')).toBeTruthy();
  });

  it('reset() reinitializes', async () => {
    const kv = new MemoryKv();
    const store = new SaveStore(kv);
    await store.load();
    store.update((d) => { d.meta.shards = 100; });
    await store.flush();
    await store.reset();
    expect(store.current().meta.shards).toBe(0);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm run test:engine -- SaveStore
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/meta/SaveStore.ts src/meta/__tests__/SaveStore.spec.ts
git commit -m "feat(meta): SaveStore with atomic two-key swap and tmp recovery"
```

### Task C4: `TechTree` + `EffectsContext` builder

**Files:**
- Create: `src/meta/TechTree.ts`
- Test: `src/meta/__tests__/TechTree.spec.ts`

- [ ] **Step 1: Implement TechTree**

Create `src/meta/TechTree.ts`:

```ts
import type { TechNode, TechEffect } from '@/content/types';
import type { SaveDataLatest } from '@/meta/schema';
import type { EffectsContext } from '@/world/World';

export type TechCatalog = readonly TechNode[];

export function isUnlockable(node: TechNode, save: SaveDataLatest): { ok: true } | { ok: false; reason: string } {
  if ((save.meta.techTree[node.id] ?? 0) > 0) return { ok: false, reason: 'already-unlocked' };
  for (const reqId of node.requires) {
    if ((save.meta.techTree[reqId] ?? 0) === 0) return { ok: false, reason: `requires:${reqId}` };
  }
  if (save.meta.shards < node.cost) return { ok: false, reason: 'not-enough-shards' };
  return { ok: true };
}

export function unlock(node: TechNode, save: SaveDataLatest): void {
  const status = isUnlockable(node, save);
  if (!status.ok) throw new Error(`cannot unlock ${node.id}: ${status.reason}`);
  save.meta.shards -= node.cost;
  save.meta.techTree[node.id] = 1;
}

export function buildEffectsContext(catalog: TechCatalog, save: SaveDataLatest): EffectsContext {
  const ctx: EffectsContext = {
    towerStatMults: {},
    behaviors: {},
    globals: { startCreditsBonus: 0, sellRebateRatio: 0.7, lifeRegenPerMinute: 0 },
  };

  for (const node of catalog) {
    if ((save.meta.techTree[node.id] ?? 0) === 0) continue;
    applyEffect(node.effect, ctx);
  }
  return ctx;
}

function applyEffect(effect: TechEffect, ctx: EffectsContext): void {
  switch (effect.kind) {
    case 'tower-behavior-chain':
      ctx.behaviors.chainKill = ctx.behaviors.chainKill ?? {};
      ctx.behaviors.chainKill[effect.tower] =
        Math.max(ctx.behaviors.chainKill[effect.tower] ?? 0, effect.chainCount);
      break;
    case 'tower-behavior-slow-field':
      // Higher tier wins (longer duration).
      const sf = ctx.behaviors.slowFieldOnLogicBomb;
      if (!sf || sf.duration < effect.duration) {
        ctx.behaviors.slowFieldOnLogicBomb = {
          duration: effect.duration,
          ...(effect.dotPerSecond !== undefined ? { dotPerSecond: effect.dotPerSecond } : {}),
        };
      }
      break;
    case 'tower-behavior-crit':
      const c = ctx.behaviors.iceLanceCrit;
      if (!c || c.chance < effect.chance) {
        ctx.behaviors.iceLanceCrit = { chance: effect.chance, mult: effect.mult };
      }
      break;
    case 'global-start-credits':
      ctx.globals.startCreditsBonus += effect.bonus;
      break;
    case 'global-sell-rebate':
      ctx.globals.sellRebateRatio = Math.max(ctx.globals.sellRebateRatio, effect.ratio);
      break;
    case 'global-life-regen':
      ctx.globals.lifeRegenPerMinute += effect.perMinute;
      break;
  }
}
```

- [ ] **Step 2: Test**

Create `src/meta/__tests__/TechTree.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isUnlockable, unlock, buildEffectsContext } from '@/meta/TechTree';
import { blankSaveDataV1 } from '@/meta/schema';
import type { TechNode } from '@/content/types';

const FW1: TechNode = {
  id: 'tower.firewall.t1', category: 'tower', cost: 30, requires: [],
  effect: { kind: 'tower-behavior-chain', tower: 'firewall', chainCount: 2 },
  displayName: 'Firewall: Chain', description: '',
};
const FW2: TechNode = {
  id: 'tower.firewall.t2', category: 'tower', cost: 80, requires: ['tower.firewall.t1'],
  effect: { kind: 'tower-behavior-chain', tower: 'firewall', chainCount: 3 },
  displayName: 'Firewall: Chain T2', description: '',
};
const REGEN: TechNode = {
  id: 'global.regen', category: 'global', cost: 60, requires: [],
  effect: { kind: 'global-life-regen', perMinute: 1 },
  displayName: 'Life Regen', description: '',
};

describe('TechTree', () => {
  it('isUnlockable rejects when prereqs not met', () => {
    const save = blankSaveDataV1(); save.meta.shards = 100;
    const r = isUnlockable(FW2, save);
    expect(r.ok).toBe(false);
  });

  it('unlock spends shards and records tier', () => {
    const save = blankSaveDataV1(); save.meta.shards = 100;
    unlock(FW1, save);
    expect(save.meta.shards).toBe(70);
    expect(save.meta.techTree['tower.firewall.t1']).toBe(1);
  });

  it('higher chain tier replaces lower in EffectsContext', () => {
    const save = blankSaveDataV1(); save.meta.shards = 200;
    unlock(FW1, save); unlock(FW2, save);
    const ctx = buildEffectsContext([FW1, FW2], save);
    expect(ctx.behaviors.chainKill?.firewall).toBe(3);
  });

  it('global regen accumulates', () => {
    const save = blankSaveDataV1(); save.meta.shards = 100;
    unlock(REGEN, save);
    const ctx = buildEffectsContext([REGEN], save);
    expect(ctx.globals.lifeRegenPerMinute).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm run test:engine -- TechTree
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/meta/TechTree.ts src/meta/__tests__/TechTree.spec.ts
git commit -m "feat(meta): TechTree unlock + EffectsContext builder"
```

### Task C5: Content — tower defs

**Files:**
- Create: `src/content/towerDefs.ts`

- [ ] **Step 1: Define towers**

Create `src/content/towerDefs.ts`:

```ts
import type { TowerDef } from '@/content/types';
import { FirewallTower } from '@/entities/towers/FirewallTower';
import { LogicBombTower } from '@/entities/towers/LogicBombTower';
import { ICELanceTower } from '@/entities/towers/ICELanceTower';

export const FIREWALL: TowerDef = {
  kind: 'firewall',
  displayName: 'Firewall',
  baseStats: { range: 3.5, fireRate: 1.2, damage: 8 },
  upgrades: [
    { range: 4.0, fireRate: 1.4, damage: 12, cost: 60 },
    { range: 4.5, fireRate: 1.7, damage: 18, cost: 110 },
  ],
  cost: 50,
  projectileKind: 'hitscan-bolt',
  defaultTargetPriority: 'first',
  targets: 'both',
  classRef: FirewallTower,
};

export const LOGIC_BOMB: TowerDef = {
  kind: 'logic-bomb',
  displayName: 'Logic Bomb',
  baseStats: { range: 2.5, fireRate: 0.5, damage: 6 },
  upgrades: [
    { range: 3.0, fireRate: 0.6, damage: 10, cost: 100 },
    { range: 3.4, fireRate: 0.8, damage: 16, cost: 180 },
  ],
  cost: 90,
  projectileKind: 'aoe-pulse',
  defaultTargetPriority: 'strongest',
  targets: 'both',
  classRef: LogicBombTower,
};

export const ICE_LANCE: TowerDef = {
  kind: 'ice-lance',
  displayName: 'ICE Lance',
  baseStats: { range: 4.5, fireRate: 0.7, damage: 22 },
  upgrades: [
    { range: 5.0, fireRate: 0.85, damage: 32, cost: 160 },
    { range: 5.5, fireRate: 1.0, damage: 50, cost: 280 },
  ],
  cost: 140,
  projectileKind: 'ballistic-pulse',
  defaultTargetPriority: 'strongest',
  targets: 'both',
  classRef: ICELanceTower,
};

export const ALL_TOWER_DEFS: readonly TowerDef[] = [FIREWALL, LOGIC_BOMB, ICE_LANCE];
```

- [ ] **Step 2: Commit**

```bash
git add src/content/towerDefs.ts
git commit -m "feat(content): tower defs (Firewall, Logic Bomb, ICE Lance)"
```

### Task C6: Content — enemy defs

**Files:**
- Create: `src/content/enemyDefs.ts`

- [ ] **Step 1: Define enemies**

Create `src/content/enemyDefs.ts`:

```ts
import type { EnemyDef } from '@/content/types';
import { WormEnemy } from '@/entities/enemies/WormEnemy';
import { TrojanEnemy } from '@/entities/enemies/TrojanEnemy';
import { DaemonEnemy } from '@/entities/enemies/DaemonEnemy';
import { RootkitEnemy } from '@/entities/enemies/RootkitEnemy';

export const WORM: EnemyDef = {
  kind: 'worm', displayName: 'Worm',
  baseStats: { hp: 18, speed: 2.6, armor: 0 },
  bounty: 4, flying: false, classRef: WormEnemy,
};

export const TROJAN: EnemyDef = {
  kind: 'trojan', displayName: 'Trojan',
  baseStats: { hp: 50, speed: 1.6, armor: 1 },
  bounty: 9, flying: false, classRef: TrojanEnemy,
};

export const DAEMON: EnemyDef = {
  kind: 'daemon', displayName: 'Daemon',
  baseStats: { hp: 130, speed: 1.0, armor: 4 },
  bounty: 18, flying: false, classRef: DaemonEnemy,
};

export const ROOTKIT: EnemyDef = {
  kind: 'rootkit', displayName: 'Rootkit',
  baseStats: { hp: 800, speed: 0.8, armor: 6 },
  bounty: 80, flying: false, classRef: RootkitEnemy,
};

export const ALL_ENEMY_DEFS: readonly EnemyDef[] = [WORM, TROJAN, DAEMON, ROOTKIT];
```

- [ ] **Step 2: Commit**

```bash
git add src/content/enemyDefs.ts
git commit -m "feat(content): enemy defs (Worm, Trojan, Daemon, Rootkit)"
```

### Task C7: Content — projectile defs

**Files:**
- Create: `src/content/projectileDefs.ts`

- [ ] **Step 1: Define projectiles**

Create `src/content/projectileDefs.ts`:

```ts
import type { ProjectileDef } from '@/content/types';
import { HitscanProjectile } from '@/entities/projectiles/HitscanProjectile';
import { BallisticProjectile } from '@/entities/projectiles/BallisticProjectile';
import { AoEPulseProjectile } from '@/entities/projectiles/AoEPulseProjectile';

export const HITSCAN_BOLT: ProjectileDef = {
  kind: 'hitscan-bolt', ttl: 0.05, classRef: HitscanProjectile,
};

export const BALLISTIC_PULSE: ProjectileDef = {
  kind: 'ballistic-pulse', ttl: 2.0, speed: 6, classRef: BallisticProjectile,
};

export const AOE_PULSE: ProjectileDef = {
  kind: 'aoe-pulse', ttl: 0.4, classRef: AoEPulseProjectile,
};

export const ALL_PROJECTILE_DEFS: readonly ProjectileDef[] = [HITSCAN_BOLT, BALLISTIC_PULSE, AOE_PULSE];
```

- [ ] **Step 2: Commit**

```bash
git add src/content/projectileDefs.ts
git commit -m "feat(content): projectile defs"
```

### Task C8: Content — tech tree (9 nodes)

**Files:**
- Create: `src/content/techNodes.ts`

- [ ] **Step 1: Define tech nodes**

Create `src/content/techNodes.ts`:

```ts
import type { TechNode } from '@/content/types';

export const TECH_NODES: readonly TechNode[] = [
  // Firewall
  {
    id: 'tower.firewall.t1', category: 'tower', cost: 30, requires: [],
    effect: { kind: 'tower-behavior-chain', tower: 'firewall', chainCount: 2 },
    displayName: 'Firewall: Chain Strike',
    description: 'On kill, chain to a 2nd target within range.',
  },
  {
    id: 'tower.firewall.t2', category: 'tower', cost: 80, requires: ['tower.firewall.t1'],
    effect: { kind: 'tower-behavior-chain', tower: 'firewall', chainCount: 3 },
    displayName: 'Firewall: Chain Strike+',
    description: 'Chain extends to a 3rd target on kill.',
  },
  // Logic Bomb
  {
    id: 'tower.logic-bomb.t1', category: 'tower', cost: 30, requires: [],
    effect: { kind: 'tower-behavior-slow-field', tower: 'logic-bomb', duration: 2 },
    displayName: 'Logic Bomb: Slow Field',
    description: 'Detonations leave a 2-second slow field.',
  },
  {
    id: 'tower.logic-bomb.t2', category: 'tower', cost: 80, requires: ['tower.logic-bomb.t1'],
    effect: { kind: 'tower-behavior-slow-field', tower: 'logic-bomb', duration: 4, dotPerSecond: 4 },
    displayName: 'Logic Bomb: Toxic Field',
    description: 'Slow field lasts 4 seconds and deals damage over time.',
  },
  // ICE Lance
  {
    id: 'tower.ice-lance.t1', category: 'tower', cost: 40, requires: [],
    effect: { kind: 'tower-behavior-crit', tower: 'ice-lance', chance: 0.25, mult: 2 },
    displayName: 'ICE Lance: Critical Hit',
    description: '25% chance to deal double damage.',
  },
  {
    id: 'tower.ice-lance.t2', category: 'tower', cost: 90, requires: ['tower.ice-lance.t1'],
    effect: { kind: 'tower-behavior-crit', tower: 'ice-lance', chance: 0.5, mult: 2 },
    displayName: 'ICE Lance: Hot Path',
    description: '50% crit chance.',
  },
  // Globals
  {
    id: 'global.reserves', category: 'global', cost: 30, requires: [],
    effect: { kind: 'global-start-credits', bonus: 50 },
    displayName: 'Reserves',
    description: '+50 starting credits per match.',
  },
  {
    id: 'global.salvage', category: 'global', cost: 40, requires: [],
    effect: { kind: 'global-sell-rebate', ratio: 0.9 },
    displayName: 'Salvage Protocols',
    description: 'Sell rebate increased to 90%.',
  },
  {
    id: 'global.self-heal', category: 'global', cost: 60, requires: [],
    effect: { kind: 'global-life-regen', perMinute: 1 },
    displayName: 'Self-Heal Subnet',
    description: 'Regenerate 1 life per minute (capped at start lives).',
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/content/techNodes.ts
git commit -m "feat(content): 9-node tech tree (3 towers × 2 tiers + 3 globals)"
```

### Task C9: Content — Level 1 ("Intranet")

**Files:**
- Create: `src/content/levels/lvl-01-intranet.ts`, `src/content/levels/stubs.ts`, `src/content/levels/index.ts`

The level 1 grid is 9 cols × 16 rows (portrait). The path snakes top-down. Tiles around the path are buildable. Tile legend in code: `'P'` = path, `'B'` = buildable, `'X'` = blocked. A helper expands the shorthand into the typed `TileType[][]`.

- [ ] **Step 1: Implement `lvl-01-intranet`**

Create `src/content/levels/lvl-01-intranet.ts`:

```ts
import type { LevelDef } from '@/content/types';
import type { TileType } from '@/world/Grid';

const SHORT = (rows: string[]): TileType[][] =>
  rows.map((r) => Array.from(r).map((c) =>
    c === 'P' ? 'path' : c === 'B' ? 'buildable' : 'blocked'
  ) as TileType[]);

// 9 cols, 16 rows. Path enters top-left, snakes down.
const grid = SHORT([
  // 0123456789
  'PPPPPBBBB',
  'XXXXPBBBB',
  'BBBBPBBBB',
  'BBBBPBBBB',
  'BBBBPPPPP',
  'BBBBBBBBP',
  'BBBBBBBBP',
  'PPPPPPPPP',
  'PXXXBBBBB',
  'PBBBBBBBB',
  'PBBBBBBBB',
  'PPPPPPBBB',
  'BBBBBPBBB',
  'BBBBBPBBB',
  'BBBBBPBBB',
  'BBBBBPBBB',
]);

const path = [
  { col: 0, row: 0 }, { col: 4, row: 0 }, { col: 4, row: 4 },
  { col: 8, row: 4 }, { col: 8, row: 7 }, { col: 0, row: 7 },
  { col: 0, row: 11 }, { col: 5, row: 11 }, { col: 5, row: 15 },
];

export const LVL_01_INTRANET: LevelDef = {
  id: 'lvl-01-intranet',
  name: 'Intranet',
  chapter: 0,
  grid: { cols: 9, rows: 16, cells: grid },
  spawners: [{ id: 'main', tile: { col: 0, row: 0 } }],
  path,
  startCredits: 100,
  startLives: 20,
  starThresholds: { stars3: 18, stars2: 12, stars1: 1 },
  waves: [
    // Wave 1: gentle worms
    { delayBeforeStart: 6, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'worm', count: 6, spacing: 0.8, delay: 0 },
    ]},
    // Wave 2: more worms
    { delayBeforeStart: 6, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'worm', count: 10, spacing: 0.6, delay: 0 },
    ]},
    // Wave 3: introduce trojans
    { delayBeforeStart: 8, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'worm',   count: 8, spacing: 0.6, delay: 0 },
      { id: 'g2', spawnerId: 'main', enemyKind: 'trojan', count: 3, spacing: 1.2, delay: 0, afterGroupId: 'g1' },
    ]},
    // Wave 4: mixed
    { delayBeforeStart: 8, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'worm',   count: 12, spacing: 0.5, delay: 0 },
      { id: 'g2', spawnerId: 'main', enemyKind: 'trojan', count: 5,  spacing: 1.0, delay: 3 },
    ]},
    // Wave 5: introduce daemon
    { delayBeforeStart: 10, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'trojan', count: 6, spacing: 0.9, delay: 0 },
      { id: 'g2', spawnerId: 'main', enemyKind: 'daemon', count: 2, spacing: 1.5, delay: 4 },
    ]},
    // Wave 6: rush
    { delayBeforeStart: 8, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'worm',   count: 18, spacing: 0.35, delay: 0 },
      { id: 'g2', spawnerId: 'main', enemyKind: 'trojan', count: 4,  spacing: 0.8,  delay: 5 },
    ]},
    // Wave 7: mixed harder
    { delayBeforeStart: 10, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'trojan', count: 6, spacing: 0.7, delay: 0 },
      { id: 'g2', spawnerId: 'main', enemyKind: 'daemon', count: 4, spacing: 1.2, delay: 0, afterGroupId: 'g1' },
    ]},
    // Wave 8: pre-boss filler
    { delayBeforeStart: 12, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'worm',   count: 25, spacing: 0.3, delay: 0 },
      { id: 'g2', spawnerId: 'main', enemyKind: 'daemon', count: 5,  spacing: 1.0, delay: 6 },
    ]},
    // Wave 9: hard mixed
    { delayBeforeStart: 12, groups: [
      { id: 'g1', spawnerId: 'main', enemyKind: 'daemon', count: 6, spacing: 1.0, delay: 0 },
      { id: 'g2', spawnerId: 'main', enemyKind: 'trojan', count: 8, spacing: 0.7, delay: 0, afterGroupId: 'g1' },
    ]},
    // Wave 10: boss + adds
    { delayBeforeStart: 15, groups: [
      { id: 'adds', spawnerId: 'main', enemyKind: 'trojan',  count: 8, spacing: 0.6, delay: 0 },
      { id: 'boss', spawnerId: 'main', enemyKind: 'rootkit', count: 1, spacing: 1.0, delay: 5 },
      { id: 'after-boss', spawnerId: 'main', enemyKind: 'worm', count: 12, spacing: 0.4, delay: 0, afterGroupId: 'boss' },
    ]},
  ],
};
```

- [ ] **Step 2: Stubs for chapter math**

Create `src/content/levels/stubs.ts`:

```ts
import type { LevelDef } from '@/content/types';

/** Placeholders so chapter index advancing past level 1 has somewhere to point. */
export const STUB_LEVELS: readonly LevelDef[] = [];
```

- [ ] **Step 3: Index**

Create `src/content/levels/index.ts`:

```ts
import { LVL_01_INTRANET } from '@/content/levels/lvl-01-intranet';

export const ALL_LEVELS = [LVL_01_INTRANET] as const;
export const LEVEL_BY_ID = Object.fromEntries(ALL_LEVELS.map((l) => [l.id, l]));
```

- [ ] **Step 4: Commit**

```bash
git add src/content/levels/
git commit -m "feat(content): level 1 'Intranet' map + 10 waves with afterGroupId boss adds"
```

### Task C10: Phase C checkpoint

- [ ] **Step 1: Run all engine tests**

```bash
npm run test:engine
npm run lint:tsc:engine
```

Expected: all green; engine TS clean.

- [ ] **Step 2: Tag**

```bash
git tag phase-c-content-complete
```

Stop here for review. The headless game now runs against real content. Phase D wires it into React Native.

---

## Phase D — RN Scaffold (navigation, audio, HUD bridge)

End-of-phase checkpoint: app boots, navigates Title → LevelSelect → empty Play screen → back, save persists across reload, audio manager plays a placeholder SFX, and an EventBus event causes a HUD label to update.

### Task D1: Bootstrap (catalog + audio init)

**Files:**
- Create: `src/app/bootstrap.ts`

- [ ] **Step 1: Implement bootstrap**

Create `src/app/bootstrap.ts`:

```ts
import { registerEnemies, registerProjectiles, registerTowers } from '@/entities/registry';
import { ALL_TOWER_DEFS } from '@/content/towerDefs';
import { ALL_ENEMY_DEFS } from '@/content/enemyDefs';
import { ALL_PROJECTILE_DEFS } from '@/content/projectileDefs';

let bootstrapped = false;

export function bootstrap(): void {
  if (bootstrapped) return;
  registerTowers(ALL_TOWER_DEFS);
  registerEnemies(ALL_ENEMY_DEFS);
  registerProjectiles(ALL_PROJECTILE_DEFS);
  bootstrapped = true;
}

export function _resetBootstrap(): void { bootstrapped = false; }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/bootstrap.ts
git commit -m "feat(app): bootstrap with explicit catalog registration"
```

### Task D2: zustand HUD store

**Files:**
- Create: `src/ui/hudStore.ts`
- Test: `src/ui/__tests__/hudStore.spec.ts`

- [ ] **Step 1: Implement HUD store**

Create `src/ui/hudStore.ts`:

```ts
import { create } from 'zustand';
import type { Difficulty } from '@/content/types';

export type WaveStatus = 'idle' | 'in-progress' | 'cleared';

export type HudState = {
  lives: number;
  credits: number;
  waveIndex: number;
  totalWaves: number;
  waveStatus: WaveStatus;
  speed: 1 | 2 | 3;
  paused: boolean;
  difficulty: Difficulty;
  selectedTowerId: string | null;
  /** Used by HUD overlays to flash on changes. */
  flashLives: number;
  flashCredits: number;
};

export type HudActions = {
  setLives(n: number): void;
  setCredits(n: number): void;
  setWave(i: number, total: number, status: WaveStatus): void;
  setSpeed(s: 1 | 2 | 3): void;
  setPaused(p: boolean): void;
  setDifficulty(d: Difficulty): void;
  setSelectedTowerId(id: string | null): void;
  reset(initial?: Partial<HudState>): void;
};

const INITIAL: HudState = {
  lives: 0, credits: 0, waveIndex: -1, totalWaves: 0, waveStatus: 'idle',
  speed: 1, paused: false, difficulty: 'normal',
  selectedTowerId: null, flashLives: 0, flashCredits: 0,
};

export const useHudStore = create<HudState & HudActions>((set) => ({
  ...INITIAL,
  setLives: (n) => set((s) => ({ lives: n, flashLives: s.flashLives + 1 })),
  setCredits: (n) => set((s) => ({ credits: n, flashCredits: s.flashCredits + 1 })),
  setWave: (i, total, status) => set({ waveIndex: i, totalWaves: total, waveStatus: status }),
  setSpeed: (s) => set({ speed: s }),
  setPaused: (p) => set({ paused: p }),
  setDifficulty: (d) => set({ difficulty: d }),
  setSelectedTowerId: (id) => set({ selectedTowerId: id }),
  reset: (initial) => set({ ...INITIAL, ...initial }),
}));
```

- [ ] **Step 2: Smoke test**

Create `src/ui/__tests__/hudStore.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { useHudStore } from '@/ui/hudStore';

describe('hudStore', () => {
  it('updates lives and bumps flash counter', () => {
    useHudStore.getState().reset();
    expect(useHudStore.getState().lives).toBe(0);
    useHudStore.getState().setLives(20);
    expect(useHudStore.getState().lives).toBe(20);
    expect(useHudStore.getState().flashLives).toBe(1);
  });

  it('reset honors initial overrides', () => {
    useHudStore.getState().reset({ lives: 10, credits: 100, totalWaves: 10 });
    expect(useHudStore.getState().lives).toBe(10);
    expect(useHudStore.getState().credits).toBe(100);
  });
});
```

> Note: this test runs in vitest. zustand is RN-free at the core; the test does not require jest-expo. Configure vitest to include `src/ui/**/*.spec.ts`. Update `vitest.config.ts`:
>
> ```ts
> // add to test.include:
> 'src/ui/**/*.spec.ts',
> ```

- [ ] **Step 3: Edit `vitest.config.ts`**

Find the `include` array and add `'src/ui/**/*.spec.ts',` to it.

- [ ] **Step 4: Run tests**

```bash
npm run test:engine -- hudStore
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/ui/hudStore.ts src/ui/__tests__/hudStore.spec.ts vitest.config.ts
git commit -m "feat(ui): zustand HUD store"
```

### Task D3: EventBus → HUD bridge

**Files:**
- Create: `src/ui/eventBridge.ts`
- Test: `src/ui/__tests__/eventBridge.spec.ts`

- [ ] **Step 1: Implement bridge**

Create `src/ui/eventBridge.ts`:

```ts
import type { EventBus, SimEventMap } from '@/engine/EventBus';
import { useHudStore } from '@/ui/hudStore';

/**
 * Subscribe HUD state to engine events. Returns a teardown function.
 * Call inside PlayScreen on mount; tear down on unmount.
 */
export function attachEventBridge(bus: EventBus<SimEventMap>): () => void {
  const offs: Array<() => void> = [];

  offs.push(bus.on('lives-changed', ({ lives }) => useHudStore.getState().setLives(lives)));
  offs.push(bus.on('credits-changed', ({ credits }) => useHudStore.getState().setCredits(credits)));
  offs.push(bus.on('wave-started', ({ waveIndex }) => {
    const s = useHudStore.getState();
    s.setWave(waveIndex, s.totalWaves, 'in-progress');
  }));
  offs.push(bus.on('wave-cleared', ({ waveIndex }) => {
    const s = useHudStore.getState();
    s.setWave(waveIndex, s.totalWaves, 'cleared');
  }));

  return () => { for (const off of offs) off(); };
}
```

- [ ] **Step 2: Test**

Create `src/ui/__tests__/eventBridge.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus, type SimEventMap } from '@/engine/EventBus';
import { attachEventBridge } from '@/ui/eventBridge';
import { useHudStore } from '@/ui/hudStore';

describe('eventBridge', () => {
  beforeEach(() => { useHudStore.getState().reset({ totalWaves: 10 }); });

  it('updates lives on life-lost via lives-changed', () => {
    const bus = new EventBus<SimEventMap>();
    const off = attachEventBridge(bus);
    bus.emit('lives-changed', { lives: 18 });
    bus.flush();
    expect(useHudStore.getState().lives).toBe(18);
    off();
  });

  it('updates wave state on wave-started/cleared', () => {
    const bus = new EventBus<SimEventMap>();
    attachEventBridge(bus);
    bus.emit('wave-started', { waveIndex: 0 });
    bus.flush();
    expect(useHudStore.getState().waveIndex).toBe(0);
    expect(useHudStore.getState().waveStatus).toBe('in-progress');
    bus.emit('wave-cleared', { waveIndex: 0 });
    bus.flush();
    expect(useHudStore.getState().waveStatus).toBe('cleared');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm run test:engine -- eventBridge
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/ui/eventBridge.ts src/ui/__tests__/eventBridge.spec.ts
git commit -m "feat(ui): EventBus → HUD store bridge"
```

### Task D4: AsyncStorage adapter for `KeyValueStore`

**Files:**
- Create: `src/meta/asyncStorageKv.ts`

- [ ] **Step 1: Wire AsyncStorage**

Create `src/meta/asyncStorageKv.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KeyValueStore } from '@/meta/SaveStore';

export const asyncStorageKv: KeyValueStore = {
  async getItem(k) { return AsyncStorage.getItem(k); },
  async setItem(k, v) { await AsyncStorage.setItem(k, v); },
  async removeItem(k) { await AsyncStorage.removeItem(k); },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/meta/asyncStorageKv.ts
git commit -m "feat(meta): AsyncStorage adapter for KeyValueStore"
```

### Task D5: AudioManager (`expo-audio`, pooled SFX)

**Files:**
- Create: `src/audio/catalog.ts`, `src/audio/AudioManager.ts`, placeholder `src/audio/assets/silent-100ms.mp3`

`expo-audio` is the new Expo audio API. We pool SFX as multiple `AudioPlayer` instances per key for overlap, and crossfade music with `volume`.

- [ ] **Step 1: Add the placeholder asset**

Generate a 100ms silent mp3 (engineer can use `ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 0.1 -q:a 9 silent-100ms.mp3` or download a 1KB silent stub from a royalty-free asset library). Place at `src/audio/assets/silent-100ms.mp3`.

> If `ffmpeg` is unavailable, copy any short permissively-licensed `.mp3` into the path; the rest of the wiring works regardless of the file's contents.

- [ ] **Step 2: Catalog**

Create `src/audio/catalog.ts`:

```ts
const silent = require('./assets/silent-100ms.mp3');

export const SFX_SOURCES = {
  'tower-fire-firewall':   silent,
  'tower-fire-logic-bomb': silent,
  'tower-fire-ice-lance':  silent,
  'enemy-hit':             silent,
  'enemy-death':           silent,
  'wave-start':            silent,
  'life-lost':             silent,
  'win':                   silent,
  'lose':                  silent,
  'ui-click':              silent,
  'tower-placed':          silent,
} as const;
export type SfxKey = keyof typeof SFX_SOURCES;

export const MUSIC_SOURCES = {
  'main-menu':  silent,
  'in-game':    silent,
} as const;
export type MusicKey = keyof typeof MUSIC_SOURCES;

/** Pool size per SFX. */
export const SFX_POOL_SIZE: Readonly<Record<SfxKey, number>> = {
  'tower-fire-firewall':   4,
  'tower-fire-logic-bomb': 2,
  'tower-fire-ice-lance':  3,
  'enemy-hit':             4,
  'enemy-death':           3,
  'wave-start':            1,
  'life-lost':             1,
  'win':                   1,
  'lose':                  1,
  'ui-click':              2,
  'tower-placed':          2,
};
```

- [ ] **Step 3: AudioManager**

Create `src/audio/AudioManager.ts`:

```ts
import { setAudioModeAsync, AudioPlayer, createAudioPlayer } from 'expo-audio';
import { SFX_SOURCES, MUSIC_SOURCES, SFX_POOL_SIZE, type SfxKey, type MusicKey } from '@/audio/catalog';

export type Volumes = { master: number; sfx: number; music: number };

export class AudioManager {
  private volumes: Volumes = { master: 1, sfx: 1, music: 0.7 };
  private sfxPools = new Map<SfxKey, { players: AudioPlayer[]; cursor: number }>();
  private musicPlayer: AudioPlayer | null = null;
  private currentMusic: MusicKey | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
    for (const key of Object.keys(SFX_SOURCES) as SfxKey[]) {
      const players: AudioPlayer[] = [];
      const poolSize = SFX_POOL_SIZE[key];
      for (let i = 0; i < poolSize; i++) {
        players.push(createAudioPlayer(SFX_SOURCES[key]));
      }
      this.sfxPools.set(key, { players, cursor: 0 });
    }
    this.initialized = true;
  }

  setVolumes(v: Partial<Volumes>): void {
    this.volumes = { ...this.volumes, ...v };
    if (this.musicPlayer) this.musicPlayer.volume = this.volumes.master * this.volumes.music;
  }

  playSfx(key: SfxKey): void {
    const pool = this.sfxPools.get(key);
    if (!pool) return;
    const player = pool.players[pool.cursor]!;
    pool.cursor = (pool.cursor + 1) % pool.players.length;
    try {
      player.volume = this.volumes.master * this.volumes.sfx;
      player.seekTo(0);
      player.play();
    } catch { /* swallow on RN runtime quirks */ }
  }

  async playMusic(key: MusicKey): Promise<void> {
    if (this.currentMusic === key && this.musicPlayer) return;
    if (this.musicPlayer) {
      try { await this.musicPlayer.pause(); } catch {}
      this.musicPlayer.remove();
      this.musicPlayer = null;
    }
    this.musicPlayer = createAudioPlayer(MUSIC_SOURCES[key]);
    this.musicPlayer.loop = true;
    this.musicPlayer.volume = this.volumes.master * this.volumes.music;
    this.musicPlayer.play();
    this.currentMusic = key;
  }

  async stopMusic(): Promise<void> {
    if (!this.musicPlayer) return;
    try { await this.musicPlayer.pause(); } catch {}
    this.musicPlayer.remove();
    this.musicPlayer = null;
    this.currentMusic = null;
  }
}
```

> The `expo-audio` API surface evolves; if a method name above (e.g. `seekTo`, `loop`, `remove`) differs in the installed SDK, replace with the local equivalent. Reference: `node_modules/expo-audio/build/AudioPlayer.d.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/audio/
git commit -m "feat(audio): AudioManager with pooled SFX over expo-audio"
```

### Task D6: Save & audio providers

**Files:**
- Create: `src/app/providers/SaveProvider.tsx`, `src/app/providers/AudioProvider.tsx`

- [ ] **Step 1: SaveProvider**

Create `src/app/providers/SaveProvider.tsx`:

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SaveStore } from '@/meta/SaveStore';
import { asyncStorageKv } from '@/meta/asyncStorageKv';
import type { SaveDataLatest } from '@/meta/schema';

type Ctx = {
  store: SaveStore;
  data: SaveDataLatest;
  /** Trigger a re-render after a mutation. Components that mutate via store.update should call refresh(). */
  refresh: () => void;
};

const SaveContext = createContext<Ctx | null>(null);

export function SaveProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => new SaveStore(asyncStorageKv));
  const [data, setData] = useState<SaveDataLatest | null>(null);

  useEffect(() => { void store.load().then(setData); }, [store]);

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0E1A' }}>
        <ActivityIndicator color="#00F0FF" />
      </View>
    );
  }

  return (
    <SaveContext.Provider
      value={{ store, data, refresh: () => setData({ ...store.current() }) }}
    >
      {children}
    </SaveContext.Provider>
  );
}

export function useSave(): Ctx {
  const ctx = useContext(SaveContext);
  if (!ctx) throw new Error('useSave outside SaveProvider');
  return ctx;
}
```

- [ ] **Step 2: AudioProvider**

Create `src/app/providers/AudioProvider.tsx`:

```tsx
import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { AudioManager } from '@/audio/AudioManager';
import { useSave } from '@/app/providers/SaveProvider';

const AudioContext = createContext<AudioManager | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const { data } = useSave();
  const manager = useMemo(() => new AudioManager(), []);

  useEffect(() => {
    void manager.init();
    return () => { void manager.stopMusic(); };
  }, [manager]);

  useEffect(() => {
    manager.setVolumes({
      master: data.settings.audioMaster,
      sfx: data.settings.sfx,
      music: data.settings.music,
    });
  }, [manager, data.settings.audioMaster, data.settings.sfx, data.settings.music]);

  return <AudioContext.Provider value={manager}>{children}</AudioContext.Provider>;
}

export function useAudio(): AudioManager {
  const m = useContext(AudioContext);
  if (!m) throw new Error('useAudio outside AudioProvider');
  return m;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/providers/
git commit -m "feat(app): Save and Audio React providers"
```

### Task D7: Navigation + screen shells

**Files:**
- Create: `src/app/RootNav.tsx`, `src/app/screens/{Title,LevelSelect,TechTree,Play}Screen.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Navigation**

Create `src/app/RootNav.tsx`:

```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TitleScreen } from '@/app/screens/TitleScreen';
import { LevelSelectScreen } from '@/app/screens/LevelSelectScreen';
import { TechTreeScreen } from '@/app/screens/TechTreeScreen';
import { PlayScreen } from '@/app/screens/PlayScreen';
import type { Difficulty } from '@/content/types';

export type RootStackParamList = {
  Title: undefined;
  LevelSelect: undefined;
  TechTree: undefined;
  Play: { levelId: string; difficulty: Difficulty };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNav() {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: '#00F0FF', background: '#0A0E1A',
          card: '#0A0E1A', text: '#E8F1FF',
          border: '#0A0E1A', notification: '#FF2BD6',
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0E1A' } }}>
        <Stack.Screen name="Title" component={TitleScreen} />
        <Stack.Screen name="LevelSelect" component={LevelSelectScreen} />
        <Stack.Screen name="TechTree" component={TechTreeScreen} />
        <Stack.Screen name="Play" component={PlayScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 2: Screen shells**

Create `src/app/screens/TitleScreen.tsx`:

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';

type Props = NativeStackScreenProps<RootStackParamList, 'Title'>;

export function TitleScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>tower-gemax</Text>
      <Text style={styles.subtitle}>netrunner online</Text>
      <Pressable style={styles.btn} onPress={() => navigation.navigate('LevelSelect')}>
        <Text style={styles.btnText}>Run</Text>
      </Pressable>
      <Pressable style={styles.btn} onPress={() => navigation.navigate('TechTree')}>
        <Text style={styles.btnText}>Tech Tree</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0E1A', gap: 16 },
  title: { color: '#00F0FF', fontFamily: 'monospace', fontSize: 32, letterSpacing: 2 },
  subtitle: { color: '#FF2BD6', fontFamily: 'monospace', fontSize: 14, marginBottom: 32 },
  btn: { paddingVertical: 12, paddingHorizontal: 32, borderColor: '#00F0FF', borderWidth: 1 },
  btnText: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 16 },
});
```

Create `src/app/screens/LevelSelectScreen.tsx`:

```tsx
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { ALL_LEVELS } from '@/content/levels';
import { useSave } from '@/app/providers/SaveProvider';
import type { Difficulty } from '@/content/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelSelect'>;

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard', 'insane'] as const;

export function LevelSelectScreen({ navigation }: Props) {
  const { data } = useSave();
  const [difficulty, setDifficulty] = useState<Difficulty>(data.settings.difficultyDefault);

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <Text style={styles.heading}>SELECT TARGET</Text>
      <View style={styles.pills}>
        {DIFFICULTIES.map((d) => (
          <Pressable key={d} onPress={() => setDifficulty(d)} style={[styles.pill, d === difficulty && styles.pillActive]}>
            <Text style={[styles.pillText, d === difficulty && styles.pillTextActive]}>{d.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      {ALL_LEVELS.map((lvl) => {
        const stars = data.campaign[lvl.id]?.bestStarsByDifficulty[difficulty] ?? 0;
        return (
          <Pressable
            key={lvl.id}
            style={styles.card}
            onPress={() => navigation.navigate('Play', { levelId: lvl.id, difficulty })}
          >
            <Text style={styles.cardName}>{lvl.name}</Text>
            <Text style={styles.cardStars}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, padding: 24, gap: 16, backgroundColor: '#0A0E1A' },
  heading: { color: '#00F0FF', fontFamily: 'monospace', fontSize: 18, marginTop: 32 },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderColor: '#00F0FF44', borderWidth: 1 },
  pillActive: { borderColor: '#00F0FF', backgroundColor: '#00F0FF11' },
  pillText: { color: '#00F0FF88', fontFamily: 'monospace', fontSize: 12 },
  pillTextActive: { color: '#00F0FF' },
  card: { padding: 16, borderColor: '#00F0FF', borderWidth: 1, gap: 8 },
  cardName: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 16 },
  cardStars: { color: '#FFB347', fontSize: 16 },
});
```

Create `src/app/screens/TechTreeScreen.tsx`:

```tsx
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { useSave } from '@/app/providers/SaveProvider';
import { TECH_NODES } from '@/content/techNodes';
import { isUnlockable, unlock } from '@/meta/TechTree';

type Props = NativeStackScreenProps<RootStackParamList, 'TechTree'>;

export function TechTreeScreen(_: Props) {
  const { data, store, refresh } = useSave();

  const onUnlock = (nodeId: string) => {
    const node = TECH_NODES.find((n) => n.id === nodeId);
    if (!node) return;
    const r = isUnlockable(node, data);
    if (!r.ok) return;
    store.update((d) => unlock(node, d));
    refresh();
  };

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <Text style={styles.heading}>UPGRADES · {data.meta.shards} SHARDS</Text>
      {TECH_NODES.map((node) => {
        const tier = data.meta.techTree[node.id] ?? 0;
        const status = isUnlockable(node, data);
        return (
          <View key={node.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{node.displayName}</Text>
              <Text style={[styles.tier, tier > 0 && styles.tierUnlocked]}>{tier > 0 ? 'UNLOCKED' : `${node.cost} ◆`}</Text>
            </View>
            <Text style={styles.desc}>{node.description}</Text>
            {tier === 0 && (
              <Pressable
                disabled={!status.ok}
                style={[styles.unlock, !status.ok && styles.unlockDisabled]}
                onPress={() => onUnlock(node.id)}
              >
                <Text style={styles.unlockText}>{status.ok ? 'INSTALL' : status.reason}</Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, gap: 12, backgroundColor: '#0A0E1A' },
  heading: { color: '#00F0FF', fontFamily: 'monospace', fontSize: 16, marginTop: 32, marginBottom: 16 },
  card: { padding: 12, borderColor: '#00F0FF66', borderWidth: 1, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 14 },
  tier: { color: '#FFB347', fontFamily: 'monospace', fontSize: 12 },
  tierUnlocked: { color: '#7CFF6B' },
  desc: { color: '#A8B5C5', fontSize: 12, fontFamily: 'monospace' },
  unlock: { paddingVertical: 8, alignItems: 'center', borderColor: '#00F0FF', borderWidth: 1 },
  unlockDisabled: { opacity: 0.4 },
  unlockText: { color: '#00F0FF', fontFamily: 'monospace', fontSize: 12 },
});
```

Create a placeholder `src/app/screens/PlayScreen.tsx` (filled out in Phase E):

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';

type Props = NativeStackScreenProps<RootStackParamList, 'Play'>;

export function PlayScreen({ route, navigation }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>PLAY · {route.params.levelId} · {route.params.difficulty}</Text>
      <Text style={styles.text}>(rendering wired in Phase E)</Text>
      <Pressable onPress={() => navigation.goBack()} style={styles.btn}>
        <Text style={styles.btnText}>BACK</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0E1A', gap: 12 },
  text: { color: '#E8F1FF', fontFamily: 'monospace' },
  btn: { paddingVertical: 8, paddingHorizontal: 16, borderColor: '#00F0FF', borderWidth: 1, marginTop: 24 },
  btnText: { color: '#00F0FF', fontFamily: 'monospace' },
});
```

- [ ] **Step 3: Wire `App.tsx`**

Overwrite `/Users/renan/projects/tower-gemax/App.tsx`:

```tsx
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { bootstrap } from '@/app/bootstrap';
import { SaveProvider } from '@/app/providers/SaveProvider';
import { AudioProvider } from '@/app/providers/AudioProvider';
import { RootNav } from '@/app/RootNav';

export default function App() {
  useEffect(() => { bootstrap(); }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SaveProvider>
          <AudioProvider>
            <RootNav />
            <StatusBar style="light" />
          </AudioProvider>
        </SaveProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 4: Boot the app**

```bash
npx expo start --ios
```

Expected: TitleScreen renders → tap Run → LevelSelectScreen with Intranet card → tap card → PlayScreen placeholder. Tech Tree shows 9 nodes; INSTALL is disabled until you have shards.

- [ ] **Step 5: Commit**

```bash
git add App.tsx src/app/
git commit -m "feat(app): navigation + Title/LevelSelect/TechTree/Play shells"
```

### Task D8: Phase D checkpoint

- [ ] **Step 1: Run all engine tests + jest smoke**

```bash
npm run test:engine
npm test
npm run tsc
```

Expected: all green.

- [ ] **Step 2: Tag**

```bash
git tag phase-d-rn-scaffold-complete
```

Stop here for review. The app boots, navigation works, save persists. Phase E adds the visible game.

---

## Phase E — Rendering & Gestures

End-of-phase checkpoint: the player can launch level 1, watch enemies move along the path, place towers on buildable tiles, see them attack and kill enemies, change speed, pause/resume, and win or lose the match. Audio plays. Stars and shards persist.

### Task E1: Theme tokens

**Files:**
- Create: `src/render/theme.ts`

- [ ] **Step 1: Define palette + typography**

Create `src/render/theme.ts`:

```ts
export const COLORS = {
  bg: '#0A0E1A',
  bgSubtle: '#10172A',
  cyan: '#00F0FF',
  magenta: '#FF2BD6',
  acid: '#7CFF6B',
  amber: '#FFB347',
  textPrimary: '#E8F1FF',
  textMuted: '#A8B5C5',
  pathGlow: '#00F0FF',
  buildableHint: '#00F0FF44',
  invalidHint: '#FF2BD688',
  selection: '#FFB347',
  enemyHp: '#FF2BD6',
  enemyHpBg: '#5A0A3F',
} as const;

export const TYPOGRAPHY = {
  mono: 'monospace',
  uiSmall: 12,
  uiBase: 14,
  uiLarge: 18,
  hudNumeric: 16,
  title: 28,
} as const;

export const RENDER = {
  /** Pixel size of one tile on the canvas. Computed by Viewport but defaulted here for HUD math. */
  fallbackTileSizePx: 40,
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/render/theme.ts
git commit -m "feat(render): theme tokens (palette, typography)"
```

### Task E2: `GameSession` hook (engine ↔ React glue)

**Files:**
- Create: `src/render/useGameSession.ts`

The hook owns one match: creates `World`, mounts `Engine` with a Reanimated-backed redraw signal and a RAF clock, attaches the EventBus bridge, and tears down on unmount.

- [ ] **Step 1: Implement hook**

Create `src/render/useGameSession.ts`:

```ts
import { useEffect, useMemo, useRef } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { AppState } from 'react-native';
import { Engine, type Clock } from '@/engine/Engine';
import { createWorld, type World, type RedrawPort } from '@/world/World';
import { buildEffectsContext } from '@/meta/TechTree';
import { TECH_NODES } from '@/content/techNodes';
import { LEVEL_BY_ID } from '@/content/levels';
import { attachEventBridge } from '@/ui/eventBridge';
import { useHudStore } from '@/ui/hudStore';
import { useSave } from '@/app/providers/SaveProvider';
import { useAudio } from '@/app/providers/AudioProvider';
import type { Difficulty } from '@/content/types';

export type GameSession = {
  worldRef: { current: World };
  redrawTick: SharedValue<number>;
  /** UI commands. */
  startNextWave(): void;
  setSpeed(s: 1 | 2 | 3): void;
  pause(): void;
  resume(): void;
  isPaused(): boolean;
  /** Currently-selected build/sell intents are managed by PlayScreen via worldRef.current.selection. */
};

export function useGameSession(opts: { levelId: string; difficulty: Difficulty; seed: number }): GameSession {
  const { data, store, refresh } = useSave();
  const audio = useAudio();
  const redrawTick = useSharedValue(0);
  const worldRef = useRef<World | null>(null);
  const engineRef = useRef<Engine | null>(null);

  // Build world once per match.
  if (!worldRef.current) {
    const level = LEVEL_BY_ID[opts.levelId];
    if (!level) throw new Error(`unknown level ${opts.levelId}`);
    const effects = buildEffectsContext(TECH_NODES, data);
    const redraw: RedrawPort = { bump: () => { redrawTick.value = redrawTick.value + 1; } };
    worldRef.current = createWorld({
      level, difficulty: opts.difficulty, seed: opts.seed, effects, redraw,
    });
    useHudStore.getState().reset({
      lives: worldRef.current.lives,
      credits: worldRef.current.credits,
      totalWaves: level.waves.length,
      waveIndex: -1,
      waveStatus: 'idle',
      difficulty: opts.difficulty,
      speed: 1,
      paused: false,
    });
  }

  const session = useMemo<GameSession>(() => {
    const w = worldRef.current!;
    const clock: Clock = {
      now: () => global.performance?.now?.() ?? Date.now(),
      schedule: (cb) => {
        const id = requestAnimationFrame(cb);
        return () => cancelAnimationFrame(id);
      },
    };
    const engine = new Engine(w, clock, {
      onMatchEnded(world, won) {
        // Award stars / shards here.
        const lives = world.lives;
        const t = world.level.starThresholds;
        const stars: 0 | 1 | 2 | 3 = lives >= t.stars3 ? 3 : lives >= t.stars2 ? 2 : lives > 0 ? 1 : 0;
        if (won) {
          store.update((d) => {
            const lvl = (d.campaign[world.level.id] ??= {
              bestStarsByDifficulty: {}, bestWaveReached: 0, cleared: false, shardsAwardedFor: [],
            });
            const prev = lvl.bestStarsByDifficulty[opts.difficulty] ?? 0;
            if (stars > prev) lvl.bestStarsByDifficulty[opts.difficulty] = stars;
            lvl.cleared = true;
            lvl.bestWaveReached = world.waveDirector.totalWaves;
            if (!lvl.shardsAwardedFor.includes(opts.difficulty)) {
              const award = Math.round(stars * 10 * world.difficulty.shardRewardMult * (1 + 0.05 * world.level.chapter));
              d.meta.shards += award;
              lvl.shardsAwardedFor.push(opts.difficulty);
            }
          });
          refresh();
          audio.playSfx('win');
        } else {
          audio.playSfx('lose');
        }
      },
    });
    engineRef.current = engine;
    const off = attachEventBridge(w.bus);

    // Wire SFX cues.
    const offHits: Array<() => void> = [];
    offHits.push(w.bus.on('enemy-died', () => audio.playSfx('enemy-death')));
    offHits.push(w.bus.on('life-lost', () => audio.playSfx('life-lost')));
    offHits.push(w.bus.on('wave-started', () => audio.playSfx('wave-start')));
    offHits.push(w.bus.on('tower-placed', () => audio.playSfx('tower-placed')));

    engine.start();

    return {
      worldRef: worldRef as { current: World },
      redrawTick,
      startNextWave: () => engine.startNextWave(),
      setSpeed: (s) => { engine.setSpeed(s); useHudStore.getState().setSpeed(s); },
      pause: () => { engine.pause(); useHudStore.getState().setPaused(true); },
      resume: () => { engine.resume(); useHudStore.getState().setPaused(false); },
      isPaused: () => w.status === 'paused',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pause on background, resume on foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const eng = engineRef.current; if (!eng) return;
      if (state !== 'active') eng.pause();
    });
    return () => sub.remove();
  }, []);

  // Stop the engine on unmount.
  useEffect(() => () => { engineRef.current?.stop(); }, []);

  return session;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/render/useGameSession.ts
git commit -m "feat(render): useGameSession hook (engine ↔ React glue)"
```

### Task E3: SkiaWorld canvas composition

**Files:**
- Create: `src/render/SkiaWorld.tsx`, `src/render/layers/BackgroundLayer.tsx`, `src/render/layers/PathLayer.tsx`, `src/render/layers/GridOverlayLayer.tsx`

- [ ] **Step 1: SkiaWorld**

Create `src/render/SkiaWorld.tsx`:

```tsx
import React, { useMemo, useState } from 'react';
import { Canvas, Group } from '@shopify/react-native-skia';
import { type LayoutChangeEvent, View, StyleSheet, PixelRatio } from 'react-native';
import { Viewport } from '@/engine/Viewport';
import { BackgroundLayer } from '@/render/layers/BackgroundLayer';
import { PathLayer } from '@/render/layers/PathLayer';
import { GridOverlayLayer } from '@/render/layers/GridOverlayLayer';
import { TowersLayer } from '@/render/layers/TowersLayer';
import { EnemiesLayer } from '@/render/layers/EnemiesLayer';
import { ProjectilesLayer } from '@/render/layers/ProjectilesLayer';
import { FXLayer } from '@/render/layers/FXLayer';
import { RangeIndicatorLayer } from '@/render/layers/RangeIndicatorLayer';
import type { GameSession } from '@/render/useGameSession';
import { COLORS } from '@/render/theme';

export function SkiaWorld({ session }: { session: GameSession }) {
  const world = session.worldRef.current;
  const [size, setSize] = useState<{ w: number; h: number; x: number; y: number } | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    e.target?.measure?.((_x, _y, _w, _h, pageX, pageY) => {
      setSize({ w: width, h: height, x: pageX, y: pageY });
    });
  };

  const viewport = useMemo(() => {
    if (!size) return null;
    return new Viewport({
      canvasWidthPx: size.w,
      canvasHeightPx: size.h,
      gridCols: world.level.grid.cols,
      gridRows: world.level.grid.rows,
      canvasOriginScreen: { x: size.x, y: size.y },
      dpr: PixelRatio.get(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size?.w, size?.h, size?.x, size?.y]);

  return (
    <View style={styles.root} onLayout={onLayout}>
      {viewport && (
        <Canvas style={StyleSheet.absoluteFillObject}>
          <Group>
            <BackgroundLayer viewport={viewport} />
            <PathLayer world={world} viewport={viewport} />
            <GridOverlayLayer world={world} viewport={viewport} redrawTick={session.redrawTick} />
            <TowersLayer world={world} viewport={viewport} redrawTick={session.redrawTick} />
            <EnemiesLayer world={world} viewport={viewport} redrawTick={session.redrawTick} />
            <ProjectilesLayer world={world} viewport={viewport} redrawTick={session.redrawTick} />
            <FXLayer world={world} viewport={viewport} redrawTick={session.redrawTick} />
            <RangeIndicatorLayer world={world} viewport={viewport} redrawTick={session.redrawTick} />
          </Group>
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
});
```

- [ ] **Step 2: BackgroundLayer**

Create `src/render/layers/BackgroundLayer.tsx`:

```tsx
import React from 'react';
import { Rect } from '@shopify/react-native-skia';
import type { Viewport } from '@/engine/Viewport';
import { COLORS } from '@/render/theme';

export function BackgroundLayer({ viewport }: { viewport: Viewport }) {
  return <Rect x={0} y={0} width={viewport.canvasWidthPx} height={viewport.canvasHeightPx} color={COLORS.bg} />;
}
```

- [ ] **Step 3: PathLayer**

Create `src/render/layers/PathLayer.tsx`:

```tsx
import React, { useMemo } from 'react';
import { Path as SkPath, Skia, BlurMask } from '@shopify/react-native-skia';
import type { World } from '@/world/World';
import type { Viewport } from '@/engine/Viewport';
import { COLORS } from '@/render/theme';

export function PathLayer({ world, viewport }: { world: World; viewport: Viewport }) {
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    const pts = world.level.path;
    if (pts.length < 2) return p;
    const first = viewport.gridToWorld(pts[0]!);
    p.moveTo(first.x, first.y);
    for (let i = 1; i < pts.length; i++) {
      const xy = viewport.gridToWorld(pts[i]!);
      p.lineTo(xy.x, xy.y);
    }
    return p;
  }, [world.level.path, viewport]);

  return (
    <>
      <SkPath path={path} style="stroke" strokeWidth={viewport.tileSize * 0.7} color={COLORS.pathGlow} opacity={0.18} strokeCap="round" strokeJoin="round" />
      <SkPath path={path} style="stroke" strokeWidth={viewport.tileSize * 0.4} color={COLORS.pathGlow} opacity={0.6} strokeCap="round" strokeJoin="round">
        <BlurMask blur={6} style="solid" />
      </SkPath>
      <SkPath path={path} style="stroke" strokeWidth={1.5} color={COLORS.cyan} strokeCap="round" strokeJoin="round" />
    </>
  );
}
```

- [ ] **Step 4: GridOverlayLayer (build-hint highlights)**

Create `src/render/layers/GridOverlayLayer.tsx`:

```tsx
import React from 'react';
import { Group, Rect, useDerivedValueOnJS } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { World } from '@/world/World';
import type { Viewport } from '@/engine/Viewport';
import { COLORS } from '@/render/theme';

export function GridOverlayLayer({
  world, viewport, redrawTick,
}: { world: World; viewport: Viewport; redrawTick: SharedValue<number> }) {
  // Recompute on every redraw tick via Reanimated's derived value.
  const items = useDerivedValue(() => {
    redrawTick.value;     // dependency
    const out: Array<{ x: number; y: number; size: number; color: string }> = [];
    const sel = world.selection.buildSpot;
    if (!sel) return out;
    const xy = viewport.gridToWorld(sel);
    const valid = world.grid.canBuild(sel);
    out.push({
      x: xy.x - viewport.tileSize / 2,
      y: xy.y - viewport.tileSize / 2,
      size: viewport.tileSize,
      color: valid ? COLORS.buildableHint : COLORS.invalidHint,
    });
    return out;
  });

  return (
    <Group>
      {/* Skia render reads from items.value imperatively via children below.
          Because Skia children support Reanimated's shared-value-based props,
          we expand to a fixed list (1 highlight) using opacity to hide when none.
       */}
      <Rect
        x={useDerivedValue(() => items.value[0]?.x ?? 0)}
        y={useDerivedValue(() => items.value[0]?.y ?? 0)}
        width={useDerivedValue(() => items.value[0]?.size ?? 0)}
        height={useDerivedValue(() => items.value[0]?.size ?? 0)}
        color={useDerivedValue(() => items.value[0]?.color ?? COLORS.buildableHint)}
        opacity={useDerivedValue(() => (items.value.length > 0 ? 0.6 : 0))}
      />
    </Group>
  );
}
```

> Note: `useDerivedValueOnJS` is imported defensively but not used directly; remove if unused or keep for future pure-JS computations driven by `redrawTick`.

- [ ] **Step 5: Commit**

```bash
git add src/render/SkiaWorld.tsx src/render/layers/BackgroundLayer.tsx src/render/layers/PathLayer.tsx src/render/layers/GridOverlayLayer.tsx
git commit -m "feat(render): SkiaWorld canvas + Background/Path/GridOverlay layers"
```

### Task E4: Towers + Enemies layers

**Files:**
- Create: `src/render/layers/TowersLayer.tsx`, `src/render/layers/EnemiesLayer.tsx`

- [ ] **Step 1: TowersLayer**

Create `src/render/layers/TowersLayer.tsx`:

```tsx
import React from 'react';
import { Group, Circle, Rect } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { World } from '@/world/World';
import type { Viewport } from '@/engine/Viewport';
import { COLORS } from '@/render/theme';

const MAX_TOWERS = 80;

export function TowersLayer({
  world, viewport, redrawTick,
}: { world: World; viewport: Viewport; redrawTick: SharedValue<number> }) {
  const snapshot = useDerivedValue(() => {
    redrawTick.value;
    const out: Array<{ x: number; y: number; defKind: string; level: number }> = [];
    const towers = world.entities.towers;
    for (let i = 0; i < towers.length && i < MAX_TOWERS; i++) {
      const t = towers[i]!;
      out.push({
        x: t.x * viewport.tileSize,
        y: t.y * viewport.tileSize,
        defKind: t.defKind,
        level: t.level,
      });
    }
    return out;
  });

  return (
    <Group>
      {Array.from({ length: MAX_TOWERS }, (_, i) => {
        const cx = useDerivedValue(() => snapshot.value[i]?.x ?? -1000);
        const cy = useDerivedValue(() => snapshot.value[i]?.y ?? -1000);
        const opacity = useDerivedValue(() => (i < snapshot.value.length ? 1 : 0));
        const r = viewport.tileSize * 0.36;
        return (
          <Group key={i} opacity={opacity}>
            <Circle cx={cx} cy={cy} r={r} color={COLORS.cyan} opacity={0.18} />
            <Circle cx={cx} cy={cy} r={r * 0.7} color={COLORS.cyan} opacity={0.5} />
            <Rect
              x={useDerivedValue(() => (snapshot.value[i]?.x ?? 0) - r * 0.3)}
              y={useDerivedValue(() => (snapshot.value[i]?.y ?? 0) - r * 0.3)}
              width={r * 0.6}
              height={r * 0.6}
              color={
                snapshotColor(snapshot, i)
              }
            />
          </Group>
        );
      })}
    </Group>
  );
}

function snapshotColor(
  snapshot: ReturnType<typeof useDerivedValue<{ defKind: string }[]>>,
  i: number,
) {
  return useDerivedValue(() => {
    const k = snapshot.value[i]?.defKind;
    if (k === 'firewall') return '#00F0FF';
    if (k === 'logic-bomb') return '#FF2BD6';
    if (k === 'ice-lance') return '#7CFF6B';
    return '#888';
  });
}
```

> The fixed-cap `MAX_TOWERS` keeps the React tree stable (Skia + Reanimated rebind shared values cleanly when children count is constant). Empty slots are positioned off-canvas with opacity 0.

- [ ] **Step 2: EnemiesLayer**

Create `src/render/layers/EnemiesLayer.tsx`:

```tsx
import React from 'react';
import { Group, Circle, Rect } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { World } from '@/world/World';
import type { Viewport } from '@/engine/Viewport';
import { COLORS } from '@/render/theme';

const MAX_ENEMIES = 200;

export function EnemiesLayer({
  world, viewport, redrawTick,
}: { world: World; viewport: Viewport; redrawTick: SharedValue<number> }) {
  const snapshot = useDerivedValue(() => {
    redrawTick.value;
    const out: Array<{ x: number; y: number; defKind: string; hp: number; maxHp: number }> = [];
    const enemies = world.entities.enemies;
    for (let i = 0; i < enemies.length && i < MAX_ENEMIES; i++) {
      const e = enemies[i]!;
      if (!e.alive) continue;
      out.push({
        x: e.x * viewport.tileSize,
        y: e.y * viewport.tileSize,
        defKind: e.defKind,
        hp: e.hp,
        maxHp: e.maxHp,
      });
    }
    return out;
  });

  return (
    <Group>
      {Array.from({ length: MAX_ENEMIES }, (_, i) => {
        const r = viewport.tileSize * 0.22;
        const cx = useDerivedValue(() => snapshot.value[i]?.x ?? -1000);
        const cy = useDerivedValue(() => snapshot.value[i]?.y ?? -1000);
        const color = useDerivedValue(() => enemyColor(snapshot.value[i]?.defKind));
        const opacity = useDerivedValue(() => (i < snapshot.value.length ? 1 : 0));
        const hpFrac = useDerivedValue(() =>
          snapshot.value[i] ? Math.max(0, Math.min(1, snapshot.value[i]!.hp / snapshot.value[i]!.maxHp)) : 0,
        );
        return (
          <Group key={i} opacity={opacity}>
            <Circle cx={cx} cy={cy} r={r} color={color} />
            <Rect
              x={useDerivedValue(() => (snapshot.value[i]?.x ?? 0) - r)}
              y={useDerivedValue(() => (snapshot.value[i]?.y ?? 0) - r * 1.6)}
              width={r * 2}
              height={3}
              color={COLORS.enemyHpBg}
            />
            <Rect
              x={useDerivedValue(() => (snapshot.value[i]?.x ?? 0) - r)}
              y={useDerivedValue(() => (snapshot.value[i]?.y ?? 0) - r * 1.6)}
              width={useDerivedValue(() => (r * 2) * hpFrac.value)}
              height={3}
              color={COLORS.enemyHp}
            />
          </Group>
        );
      })}
    </Group>
  );
}

function enemyColor(defKind?: string): string {
  switch (defKind) {
    case 'worm': return '#7CFF6B';
    case 'trojan': return '#FFB347';
    case 'daemon': return '#FF2BD6';
    case 'rootkit': return '#FF2BD6';
    default: return '#888';
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/render/layers/TowersLayer.tsx src/render/layers/EnemiesLayer.tsx
git commit -m "feat(render): TowersLayer + EnemiesLayer (vector primitives + HP bars)"
```

### Task E5: Projectiles + FX + RangeIndicator layers

**Files:**
- Create: `src/render/layers/ProjectilesLayer.tsx`, `src/render/layers/FXLayer.tsx`, `src/render/layers/RangeIndicatorLayer.tsx`

- [ ] **Step 1: ProjectilesLayer**

Create `src/render/layers/ProjectilesLayer.tsx`:

```tsx
import React from 'react';
import { Group, Circle } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { World } from '@/world/World';
import type { Viewport } from '@/engine/Viewport';

const MAX_PROJECTILES = 64;

export function ProjectilesLayer({
  world, viewport, redrawTick,
}: { world: World; viewport: Viewport; redrawTick: SharedValue<number> }) {
  const snapshot = useDerivedValue(() => {
    redrawTick.value;
    const out: Array<{ x: number; y: number; kind: string; r: number }> = [];
    for (const p of world.entities.projectiles) {
      if (!p.alive) continue;
      const r = p.kind === 'projectile:aoe-pulse'
        ? (p as any).currentRadius * viewport.tileSize
        : viewport.tileSize * 0.08;
      out.push({ x: p.x * viewport.tileSize, y: p.y * viewport.tileSize, kind: p.kind, r });
      if (out.length >= MAX_PROJECTILES) break;
    }
    return out;
  });

  return (
    <Group>
      {Array.from({ length: MAX_PROJECTILES }, (_, i) => {
        const cx = useDerivedValue(() => snapshot.value[i]?.x ?? -1000);
        const cy = useDerivedValue(() => snapshot.value[i]?.y ?? -1000);
        const r = useDerivedValue(() => snapshot.value[i]?.r ?? 0);
        const opacity = useDerivedValue(() => (i < snapshot.value.length ? 0.8 : 0));
        return <Circle key={i} cx={cx} cy={cy} r={r} color="#00F0FF" opacity={opacity} />;
      })}
    </Group>
  );
}
```

- [ ] **Step 2: FXLayer (placeholder for hit/death sparks)**

Create `src/render/layers/FXLayer.tsx`:

```tsx
import React from 'react';
import { Group } from '@shopify/react-native-skia';
import type { World } from '@/world/World';
import type { Viewport } from '@/engine/Viewport';
import type { SharedValue } from 'react-native-reanimated';

export function FXLayer(_: { world: World; viewport: Viewport; redrawTick: SharedValue<number> }) {
  // v1: empty group. Hooks are in place for hit-sparks/death-flashes in a later iteration.
  return <Group />;
}
```

- [ ] **Step 3: RangeIndicatorLayer**

Create `src/render/layers/RangeIndicatorLayer.tsx`:

```tsx
import React from 'react';
import { Circle } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { World } from '@/world/World';
import type { Viewport } from '@/engine/Viewport';
import { COLORS } from '@/render/theme';

export function RangeIndicatorLayer({
  world, viewport, redrawTick,
}: { world: World; viewport: Viewport; redrawTick: SharedValue<number> }) {
  const snap = useDerivedValue(() => {
    redrawTick.value;
    const id = world.selection.towerId;
    if (!id) return { x: -1000, y: -1000, r: 0 };
    const t = world.entities.towers.find((x) => x.id === id);
    if (!t) return { x: -1000, y: -1000, r: 0 };
    return { x: t.x * viewport.tileSize, y: t.y * viewport.tileSize, r: t.base.range * viewport.tileSize };
  });
  const cx = useDerivedValue(() => snap.value.x);
  const cy = useDerivedValue(() => snap.value.y);
  const r = useDerivedValue(() => snap.value.r);

  return <Circle cx={cx} cy={cy} r={r} color={COLORS.selection} opacity={0.18} style="stroke" strokeWidth={2} />;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/render/layers/ProjectilesLayer.tsx src/render/layers/FXLayer.tsx src/render/layers/RangeIndicatorLayer.tsx
git commit -m "feat(render): Projectiles/FX/RangeIndicator layers"
```

### Task E6: Gestures (tap-to-place, tap-to-select)

**Files:**
- Create: `src/render/useWorldGestures.ts`

- [ ] **Step 1: Gestures**

Create `src/render/useWorldGestures.ts`:

```ts
import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import type { Viewport } from '@/engine/Viewport';
import type { World } from '@/world/World';
import type { TowerKind } from '@/content/types';
import { getTowerDef } from '@/entities/registry';
import { useHudStore } from '@/ui/hudStore';

export function useWorldGestures(opts: {
  worldRef: { current: World };
  getViewport: () => Viewport | null;
  getBuyKind: () => TowerKind | null;
  setBuyKind: (k: TowerKind | null) => void;
}) {
  return useMemo(() => {
    const tap = Gesture.Tap()
      .maxDuration(250)
      .onEnd((e) => {
        runOnJS(handleTap)(e.x, e.y);
      });

    function handleTap(screenX: number, screenY: number) {
      const w = opts.worldRef.current;
      const vp = opts.getViewport(); if (!vp) return;
      const local = { x: screenX - 0, y: screenY - 0 };  // gesture is canvas-local already
      const grid = vp.worldToGrid(local);
      const buyKind = opts.getBuyKind();

      if (buyKind) {
        const def = getTowerDef(buyKind);
        if (!w.grid.canBuild(grid) || w.credits < def.cost) return;
        w.credits -= def.cost;
        const center = vp.gridToWorld(grid);
        const id = w.idGen('tower');
        const tower = new def.classRef({
          id, defKind: def.kind, level: 1,
          x: center.x / vp.tileSize, y: center.y / vp.tileSize,
          tileCoord: grid,
          baseStats: { ...def.baseStats },
          projectileKind: def.projectileKind,
          targets: def.targets,
          defaultTargetPriority: def.defaultTargetPriority,
        });
        w.grid.occupy(grid, id);
        w.entities.towers.push(tower);
        w.bus.emit('tower-placed', { towerId: id, kind: def.kind });
        w.bus.emit('credits-changed', { credits: w.credits });
        opts.setBuyKind(null);
        return;
      }

      // No buy intent — try to select a tower at the tapped tile.
      const occ = w.grid.occupantAt(grid);
      if (occ) {
        w.selection = { towerId: occ };
        useHudStore.getState().setSelectedTowerId(occ);
      } else {
        w.selection = {};
        useHudStore.getState().setSelectedTowerId(null);
      }
    }

    return Gesture.Race(tap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
```

> The tap gesture's `e.x, e.y` are already canvas-local because `<GestureDetector>` wraps the canvas; no insets to subtract.

- [ ] **Step 2: Commit**

```bash
git add src/render/useWorldGestures.ts
git commit -m "feat(render): tap gesture for place/select with hit-test"
```

### Task E7: HUD components

**Files:**
- Create: `src/ui/components/{HUDTop,HUDBottom,TowerPanel,WavePreview}.tsx`

- [ ] **Step 1: HUDTop**

Create `src/ui/components/HUDTop.tsx`:

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useHudStore } from '@/ui/hudStore';

export function HUDTop({
  onPause, onSpeed, onSendNextWave,
}: { onPause: () => void; onSpeed: (s: 1 | 2 | 3) => void; onSendNextWave: () => void }) {
  const lives = useHudStore((s) => s.lives);
  const credits = useHudStore((s) => s.credits);
  const waveIndex = useHudStore((s) => s.waveIndex);
  const totalWaves = useHudStore((s) => s.totalWaves);
  const speed = useHudStore((s) => s.speed);
  const status = useHudStore((s) => s.waveStatus);

  return (
    <View style={styles.root}>
      <View style={styles.col}><Text style={styles.label}>LIVES</Text><Text style={styles.value}>{lives}</Text></View>
      <View style={styles.col}><Text style={styles.label}>CREDITS</Text><Text style={styles.value}>{credits}</Text></View>
      <View style={styles.col}>
        <Text style={styles.label}>WAVE</Text>
        <Text style={styles.value}>{Math.max(0, waveIndex + 1)}/{totalWaves}</Text>
      </View>
      <View style={styles.colActions}>
        <Pressable onPress={onPause} style={styles.btn}><Text style={styles.btnText}>‖</Text></Pressable>
        {[1, 2, 3].map((s) => (
          <Pressable key={s} onPress={() => onSpeed(s as 1 | 2 | 3)} style={[styles.btn, speed === s && styles.btnActive]}>
            <Text style={styles.btnText}>{s}×</Text>
          </Pressable>
        ))}
        {(status === 'idle' || status === 'cleared') && (
          <Pressable onPress={onSendNextWave} style={[styles.btn, styles.send]}>
            <Text style={styles.btnText}>SEND</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', padding: 8, gap: 12, alignItems: 'center', backgroundColor: '#0A0E1ACC' },
  col: { alignItems: 'center' },
  colActions: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
  label: { color: '#A8B5C5', fontFamily: 'monospace', fontSize: 10 },
  value: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 14 },
  btn: { paddingVertical: 6, paddingHorizontal: 8, borderColor: '#00F0FF', borderWidth: 1 },
  btnActive: { backgroundColor: '#00F0FF22' },
  btnText: { color: '#00F0FF', fontFamily: 'monospace', fontSize: 12 },
  send: { borderColor: '#FFB347' },
});
```

- [ ] **Step 2: HUDBottom (tower buy bar)**

Create `src/ui/components/HUDBottom.tsx`:

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ALL_TOWER_DEFS } from '@/content/towerDefs';
import { useHudStore } from '@/ui/hudStore';
import type { TowerKind } from '@/content/types';

export function HUDBottom({
  selected, onSelect,
}: { selected: TowerKind | null; onSelect: (k: TowerKind | null) => void }) {
  const credits = useHudStore((s) => s.credits);
  return (
    <View style={styles.root}>
      {ALL_TOWER_DEFS.map((def) => {
        const affordable = credits >= def.cost;
        const isSelected = selected === def.kind;
        return (
          <Pressable
            key={def.kind}
            onPress={() => onSelect(isSelected ? null : def.kind)}
            disabled={!affordable && !isSelected}
            style={[styles.cell, isSelected && styles.cellSelected, !affordable && styles.cellDisabled]}
          >
            <Text style={styles.name}>{def.displayName}</Text>
            <Text style={styles.cost}>{def.cost} ¢</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', padding: 8, gap: 6, backgroundColor: '#0A0E1ACC' },
  cell: { flex: 1, padding: 8, borderColor: '#00F0FF', borderWidth: 1, alignItems: 'center' },
  cellSelected: { backgroundColor: '#00F0FF22', borderColor: '#FFB347' },
  cellDisabled: { opacity: 0.4 },
  name: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 11 },
  cost: { color: '#FFB347', fontFamily: 'monospace', fontSize: 12 },
});
```

- [ ] **Step 3: TowerPanel (selected tower side panel)**

Create `src/ui/components/TowerPanel.tsx`:

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useHudStore } from '@/ui/hudStore';
import type { World } from '@/world/World';
import type { TargetPriority } from '@/entities/Tower';
import { getTowerDef } from '@/entities/registry';

const PRIORITIES: readonly TargetPriority[] = ['first', 'last', 'strongest', 'weakest', 'closest'];

export function TowerPanel({ worldRef }: { worldRef: { current: World } }) {
  const selectedId = useHudStore((s) => s.selectedTowerId);
  if (!selectedId) return null;
  const w = worldRef.current;
  const t = w.entities.towers.find((x) => x.id === selectedId);
  if (!t) return null;
  const def = getTowerDef(t.defKind as any);

  const onSell = () => {
    const refund = Math.round(def.cost * w.effects.globals.sellRebateRatio);
    t.alive = false;
    w.grid.vacate(t.tileCoord);
    w.credits += refund;
    w.bus.emit('tower-sold', { towerId: t.id, refund });
    w.bus.emit('credits-changed', { credits: w.credits });
    w.selection = {};
    useHudStore.getState().setSelectedTowerId(null);
  };

  const onUpgrade = () => {
    if (t.level >= 3) return;
    const next = def.upgrades[t.level - 1];
    if (!next || w.credits < next.cost) return;
    w.credits -= next.cost;
    t.level = (t.level + 1) as 1 | 2 | 3;
    t.base = { range: next.range, fireRate: next.fireRate, damage: next.damage };
    w.bus.emit('tower-upgraded', { towerId: t.id, toLevel: t.level });
    w.bus.emit('credits-changed', { credits: w.credits });
  };

  const onPriority = (p: TargetPriority) => { t.targetPriority = p; };

  const upgradeCost = t.level < 3 ? def.upgrades[t.level - 1]?.cost : null;

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{def.displayName} L{t.level}</Text>
      <View style={styles.row}>
        {PRIORITIES.map((p) => (
          <Pressable
            key={p}
            onPress={() => onPriority(p)}
            style={[styles.pill, t.targetPriority === p && styles.pillActive]}
          >
            <Text style={[styles.pillText, t.targetPriority === p && styles.pillTextActive]}>
              {p[0]!.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.actions}>
        {upgradeCost != null && (
          <Pressable onPress={onUpgrade} style={styles.action}>
            <Text style={styles.actionText}>UPGRADE {upgradeCost} ¢</Text>
          </Pressable>
        )}
        <Pressable onPress={onSell} style={[styles.action, styles.sell]}>
          <Text style={styles.actionText}>SELL</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', right: 8, top: 64, padding: 8, borderColor: '#00F0FF', borderWidth: 1, backgroundColor: '#0A0E1AEE', gap: 6, minWidth: 140 },
  title: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 13 },
  row: { flexDirection: 'row', gap: 4 },
  pill: { paddingVertical: 4, paddingHorizontal: 6, borderColor: '#00F0FF44', borderWidth: 1 },
  pillActive: { borderColor: '#FFB347' },
  pillText: { color: '#00F0FF88', fontFamily: 'monospace', fontSize: 12 },
  pillTextActive: { color: '#FFB347' },
  actions: { flexDirection: 'column', gap: 4 },
  action: { paddingVertical: 6, alignItems: 'center', borderColor: '#7CFF6B', borderWidth: 1 },
  sell: { borderColor: '#FF2BD6' },
  actionText: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 11 },
});
```

- [ ] **Step 4: WavePreview**

Create `src/ui/components/WavePreview.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useHudStore } from '@/ui/hudStore';
import type { World } from '@/world/World';

export function WavePreview({ worldRef }: { worldRef: { current: World } }) {
  const status = useHudStore((s) => s.waveStatus);
  const idx = useHudStore((s) => s.waveIndex);
  if (status === 'in-progress') return null;
  const w = worldRef.current;
  const next = w.level.waves[idx + 1];
  if (!next) return null;
  const summary = aggregate(next);
  return (
    <View style={styles.root}>
      <Text style={styles.heading}>NEXT WAVE</Text>
      {Object.entries(summary).map(([kind, count]) => (
        <Text key={kind} style={styles.line}>{kind}: {count}</Text>
      ))}
    </View>
  );
}

function aggregate(wave: World['level']['waves'][number]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of wave.groups) out[g.enemyKind] = (out[g.enemyKind] ?? 0) + g.count;
  return out;
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 8, top: 64, padding: 8, borderColor: '#FFB34788', borderWidth: 1, backgroundColor: '#0A0E1AEE' },
  heading: { color: '#FFB347', fontFamily: 'monospace', fontSize: 11 },
  line: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 11 },
});
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/
git commit -m "feat(ui): HUD top/bottom + tower panel + wave preview"
```

### Task E8: Pause / Win / Lose modals

**Files:**
- Create: `src/ui/modals/{PauseModal,WinModal,LoseModal}.tsx`

- [ ] **Step 1: Modals**

Create `src/ui/modals/PauseModal.tsx`:

```tsx
import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

export function PauseModal({
  visible, onResume, onRestart, onExit,
}: { visible: boolean; onResume: () => void; onRestart: () => void; onExit: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.bg}>
        <View style={styles.card}>
          <Text style={styles.title}>PAUSED</Text>
          <Pressable onPress={onResume} style={styles.btn}><Text style={styles.btnText}>RESUME</Text></Pressable>
          <Pressable onPress={onRestart} style={styles.btn}><Text style={styles.btnText}>RESTART</Text></Pressable>
          <Pressable onPress={onExit} style={[styles.btn, styles.exit]}><Text style={styles.btnText}>EXIT</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0E1ADD' },
  card: { padding: 24, borderColor: '#00F0FF', borderWidth: 1, gap: 12, minWidth: 240 },
  title: { color: '#00F0FF', fontFamily: 'monospace', fontSize: 18, textAlign: 'center' },
  btn: { paddingVertical: 12, alignItems: 'center', borderColor: '#00F0FF', borderWidth: 1 },
  btnText: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 13 },
  exit: { borderColor: '#FF2BD6' },
});
```

Create `src/ui/modals/WinModal.tsx`:

```tsx
import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

export function WinModal({
  visible, stars, shards, onContinue,
}: { visible: boolean; stars: 0 | 1 | 2 | 3; shards: number; onContinue: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.bg}>
        <View style={styles.card}>
          <Text style={styles.title}>BREACH REPELLED</Text>
          <Text style={styles.stars}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</Text>
          {shards > 0 && <Text style={styles.shards}>+{shards} shards</Text>}
          <Pressable onPress={onContinue} style={styles.btn}><Text style={styles.btnText}>CONTINUE</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0E1ADD' },
  card: { padding: 24, borderColor: '#7CFF6B', borderWidth: 1, gap: 12, minWidth: 280, alignItems: 'center' },
  title: { color: '#7CFF6B', fontFamily: 'monospace', fontSize: 18 },
  stars: { color: '#FFB347', fontSize: 28 },
  shards: { color: '#00F0FF', fontFamily: 'monospace', fontSize: 14 },
  btn: { paddingVertical: 12, paddingHorizontal: 24, borderColor: '#7CFF6B', borderWidth: 1 },
  btnText: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 13 },
});
```

Create `src/ui/modals/LoseModal.tsx`:

```tsx
import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

export function LoseModal({
  visible, wavesCleared, onRetry, onExit,
}: { visible: boolean; wavesCleared: number; onRetry: () => void; onExit: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.bg}>
        <View style={styles.card}>
          <Text style={styles.title}>SYSTEM COMPROMISED</Text>
          <Text style={styles.sub}>Cleared {wavesCleared} wave{wavesCleared === 1 ? '' : 's'}</Text>
          <Pressable onPress={onRetry} style={styles.btn}><Text style={styles.btnText}>RETRY</Text></Pressable>
          <Pressable onPress={onExit} style={[styles.btn, styles.exit]}><Text style={styles.btnText}>EXIT</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0E1ADD' },
  card: { padding: 24, borderColor: '#FF2BD6', borderWidth: 1, gap: 12, minWidth: 280, alignItems: 'center' },
  title: { color: '#FF2BD6', fontFamily: 'monospace', fontSize: 18 },
  sub: { color: '#A8B5C5', fontFamily: 'monospace', fontSize: 12 },
  btn: { paddingVertical: 12, paddingHorizontal: 24, borderColor: '#00F0FF', borderWidth: 1 },
  btnText: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 13 },
  exit: { borderColor: '#FF2BD6' },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/modals/
git commit -m "feat(ui): Pause / Win / Lose modals"
```

### Task E9: Wire up `PlayScreen` end-to-end

**Files:**
- Replace: `src/app/screens/PlayScreen.tsx`

- [ ] **Step 1: Implement PlayScreen**

Overwrite `src/app/screens/PlayScreen.tsx`:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { SkiaWorld } from '@/render/SkiaWorld';
import { useGameSession } from '@/render/useGameSession';
import { useWorldGestures } from '@/render/useWorldGestures';
import { HUDTop } from '@/ui/components/HUDTop';
import { HUDBottom } from '@/ui/components/HUDBottom';
import { TowerPanel } from '@/ui/components/TowerPanel';
import { WavePreview } from '@/ui/components/WavePreview';
import { PauseModal } from '@/ui/modals/PauseModal';
import { WinModal } from '@/ui/modals/WinModal';
import { LoseModal } from '@/ui/modals/LoseModal';
import { useHudStore } from '@/ui/hudStore';
import type { TowerKind } from '@/content/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Play'>;

export function PlayScreen({ route, navigation }: Props) {
  const session = useGameSession({
    levelId: route.params.levelId,
    difficulty: route.params.difficulty,
    seed: 1,
  });
  const [buyKind, setBuyKind] = useState<TowerKind | null>(null);
  const [pauseVisible, setPauseVisible] = useState(false);
  const [endState, setEndState] = useState<{ won: boolean; stars: 0|1|2|3; shards: number; waves: number } | null>(null);
  const viewportRef = useRef<any>(null); // viewport is internal to SkiaWorld; pass through callbacks below

  const gestures = useWorldGestures({
    worldRef: session.worldRef,
    getViewport: () => viewportRef.current,
    getBuyKind: () => buyKind,
    setBuyKind,
  });

  // Subscribe to match-won/lost from the bus.
  useEffect(() => {
    const w = session.worldRef.current;
    const offW = w.bus.on('match-won', () => {
      const lives = w.lives;
      const t = w.level.starThresholds;
      const stars: 0|1|2|3 = lives >= t.stars3 ? 3 : lives >= t.stars2 ? 2 : lives > 0 ? 1 : 0;
      const shards = Math.round(stars * 10 * w.difficulty.shardRewardMult * (1 + 0.05 * w.level.chapter));
      setEndState({ won: true, stars, shards, waves: w.waveDirector.totalWaves });
    });
    const offL = w.bus.on('match-lost', ({ wavesCleared }) => {
      setEndState({ won: false, stars: 0, shards: 0, waves: wavesCleared });
    });
    return () => { offW(); offL(); };
  }, [session]);

  return (
    <View style={styles.root}>
      <HUDTop
        onPause={() => { session.pause(); setPauseVisible(true); }}
        onSpeed={(s) => session.setSpeed(s)}
        onSendNextWave={() => session.startNextWave()}
      />
      <GestureDetector gesture={gestures}>
        <View style={styles.canvas}>
          <SkiaWorldWithViewportRef session={session} viewportRef={viewportRef} />
        </View>
      </GestureDetector>
      <HUDBottom selected={buyKind} onSelect={setBuyKind} />
      <TowerPanel worldRef={session.worldRef} />
      <WavePreview worldRef={session.worldRef} />

      <PauseModal
        visible={pauseVisible}
        onResume={() => { setPauseVisible(false); session.resume(); }}
        onRestart={() => navigation.replace('Play', route.params)}
        onExit={() => { setPauseVisible(false); navigation.popToTop(); }}
      />
      <WinModal
        visible={endState?.won === true}
        stars={endState?.stars ?? 0}
        shards={endState?.shards ?? 0}
        onContinue={() => navigation.popToTop()}
      />
      <LoseModal
        visible={endState?.won === false}
        wavesCleared={endState?.waves ?? 0}
        onRetry={() => { setEndState(null); navigation.replace('Play', route.params); }}
        onExit={() => { setEndState(null); navigation.popToTop(); }}
      />
    </View>
  );
}

function SkiaWorldWithViewportRef({ session, viewportRef }: any) {
  // `SkiaWorld` constructs Viewport internally; we plumb a callback so PlayScreen can read it.
  // For simplicity: the viewport ref is mutated by SkiaWorld via a layout effect (added in next step).
  return <SkiaWorld session={session} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0E1A' },
  canvas: { flex: 1 },
});
```

- [ ] **Step 2: Plumb the viewport ref through `SkiaWorld`**

Edit `src/render/SkiaWorld.tsx` to expose its viewport via a callback prop. Replace the file body's `export function SkiaWorld(...)` block with:

```tsx
export function SkiaWorld({
  session,
  onViewportReady,
}: {
  session: GameSession;
  onViewportReady?: (vp: Viewport) => void;
}) {
  // ...existing body, but inside the `useMemo` for viewport, immediately after creation:
  // call onViewportReady?.(viewport);
  // ...
}
```

Then in `PlayScreen.tsx` pass `onViewportReady={(vp) => { viewportRef.current = vp; }}` to `<SkiaWorldWithViewportRef>` and wire it through.

> **Concrete edit:** in `SkiaWorld.tsx`, after the line that creates the `Viewport`, add `onViewportReady?.(vp);` and remove the wrapper `SkiaWorldWithViewportRef` from `PlayScreen.tsx` (use `<SkiaWorld session={session} onViewportReady={…} />` directly).

- [ ] **Step 3: Boot and play**

```bash
npx expo start --ios
```

Expected: navigate to Play, tap a tower in the buy bar, tap a buildable tile to place it, hit SEND to start the wave, watch enemies move and die, win or lose, see the modal.

- [ ] **Step 4: Commit**

```bash
git add src/app/screens/PlayScreen.tsx src/render/SkiaWorld.tsx
git commit -m "feat(app): PlayScreen wiring with tap-to-place, HUD, modals"
```

### Task E10: Phase E checkpoint

- [ ] **Step 1: Run all engine tests + jest smoke**

```bash
npm run test:engine
npm test
npm run tsc
```

- [ ] **Step 2: Device smoke**

Boot the app on a mid-tier Android (Pixel 6 or emulator), reach wave 8 with 3+ towers, eyeball framerate stability. If frame drops are visible, profile with Skia's draw counter.

- [ ] **Step 3: Tag**

```bash
git tag phase-e-rendering-complete
```

Stop here for review. The vertical slice is now playable end-to-end. Phase F adds wave preview interactions, level-1 polish, and the acceptance pass.

---

## Phase F — Polish, Settings, Acceptance

End-of-phase checkpoint: every line of the design's acceptance criteria is verifiable. Tag the vertical slice "v0.1.0".

### Task F1: Settings modal

**Files:**
- Create: `src/ui/modals/SettingsModal.tsx`
- Modify: `src/app/screens/TitleScreen.tsx`

- [ ] **Step 1: SettingsModal**

Create `src/ui/modals/SettingsModal.tsx`:

```tsx
import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSave } from '@/app/providers/SaveProvider';
import type { Difficulty } from '@/content/types';

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard', 'insane'];
const VOLS = [0, 0.25, 0.5, 0.75, 1];

export function SettingsModal({
  visible, onClose,
}: { visible: boolean; onClose: () => void }) {
  const { data, store, refresh } = useSave();
  const [confirmReset, setConfirmReset] = useState(false);

  const setVol = (k: 'audioMaster' | 'sfx' | 'music', v: number) => {
    store.update((d) => { d.settings[k] = v; });
    refresh();
  };
  const setDifficulty = (d: Difficulty) => {
    store.update((s) => { s.settings.difficultyDefault = d; });
    refresh();
  };
  const onReset = async () => {
    await store.reset();
    refresh();
    setConfirmReset(false);
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.bg}>
        <View style={styles.card}>
          <Text style={styles.title}>SETTINGS</Text>
          <Section label={`MASTER ${pct(data.settings.audioMaster)}`}>
            {VOLS.map((v) => (
              <Pressable key={v} onPress={() => setVol('audioMaster', v)} style={[styles.dot, data.settings.audioMaster === v && styles.dotActive]} />
            ))}
          </Section>
          <Section label={`SFX ${pct(data.settings.sfx)}`}>
            {VOLS.map((v) => (
              <Pressable key={v} onPress={() => setVol('sfx', v)} style={[styles.dot, data.settings.sfx === v && styles.dotActive]} />
            ))}
          </Section>
          <Section label={`MUSIC ${pct(data.settings.music)}`}>
            {VOLS.map((v) => (
              <Pressable key={v} onPress={() => setVol('music', v)} style={[styles.dot, data.settings.music === v && styles.dotActive]} />
            ))}
          </Section>
          <Section label="DEFAULT DIFFICULTY">
            {DIFFICULTIES.map((d) => (
              <Pressable key={d} onPress={() => setDifficulty(d)} style={[styles.pill, data.settings.difficultyDefault === d && styles.pillActive]}>
                <Text style={[styles.pillText, data.settings.difficultyDefault === d && styles.pillActiveText]}>{d.toUpperCase()}</Text>
              </Pressable>
            ))}
          </Section>
          <Pressable
            onPress={() => (confirmReset ? onReset() : setConfirmReset(true))}
            style={[styles.action, styles.danger]}
          >
            <Text style={styles.actionText}>{confirmReset ? 'TAP AGAIN TO CONFIRM' : 'RESET SAVE DATA'}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.action}>
            <Text style={styles.actionText}>CLOSE</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>{children}</View>
    </View>
  );
}
function pct(v: number): string { return `${Math.round(v * 100)}%`; }

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0E1ADD' },
  card: { padding: 20, borderColor: '#00F0FF', borderWidth: 1, gap: 12, minWidth: 320 },
  title: { color: '#00F0FF', fontFamily: 'monospace', fontSize: 16, textAlign: 'center', marginBottom: 8 },
  section: { gap: 6 },
  label: { color: '#A8B5C5', fontFamily: 'monospace', fontSize: 11 },
  row: { flexDirection: 'row', gap: 6 },
  dot: { width: 18, height: 18, borderColor: '#00F0FF44', borderWidth: 1, borderRadius: 9 },
  dotActive: { backgroundColor: '#00F0FF', borderColor: '#00F0FF' },
  pill: { paddingVertical: 4, paddingHorizontal: 8, borderColor: '#00F0FF44', borderWidth: 1 },
  pillActive: { borderColor: '#00F0FF', backgroundColor: '#00F0FF22' },
  pillText: { color: '#00F0FF88', fontFamily: 'monospace', fontSize: 11 },
  pillActiveText: { color: '#00F0FF' },
  action: { paddingVertical: 10, alignItems: 'center', borderColor: '#00F0FF', borderWidth: 1 },
  actionText: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 12 },
  danger: { borderColor: '#FF2BD6' },
});
```

- [ ] **Step 2: Add Settings button to TitleScreen**

Edit `src/app/screens/TitleScreen.tsx` to import the modal, add `useState` for visibility, and add a third Pressable below the Tech Tree button:

```tsx
// add to imports:
import { useState } from 'react';
import { SettingsModal } from '@/ui/modals/SettingsModal';

// inside the component, add:
const [settingsOpen, setSettingsOpen] = useState(false);

// render after the Tech Tree Pressable:
<Pressable style={styles.btn} onPress={() => setSettingsOpen(true)}>
  <Text style={styles.btnText}>Settings</Text>
</Pressable>
<SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
```

- [ ] **Step 3: Boot and verify**

```bash
npx expo start
```

Adjust each volume; switch difficulty; reset the save; confirm changes persist after reload.

- [ ] **Step 4: Commit**

```bash
git add src/ui/modals/SettingsModal.tsx src/app/screens/TitleScreen.tsx
git commit -m "feat(ui): SettingsModal (volumes, difficulty, reset)"
```

### Task F2: Send-next-wave-early bonus credits

**Files:**
- Modify: `src/world/WaveDirector.ts` (no changes needed — this lives in PlayScreen)
- Modify: `src/render/useGameSession.ts`

The bonus credits are computed in the engine when "send next wave" is invoked before the pre-wave countdown elapses. We track the per-wave countdown deadline on the session and award `floor(remaining * 5)` credits when SEND is pressed early.

- [ ] **Step 1: Track countdown in `useGameSession`**

Edit `src/render/useGameSession.ts` — replace the `startNextWave` implementation with:

```ts
startNextWave: () => {
  const w = worldRef.current!;
  const idx = w.waveDirector.waveIndex + 1;
  const next = w.level.waves[idx];
  if (!next) return;
  // The countdown UI is purely cosmetic; we award bonus on press equal to
  // floor(next.delayBeforeStart * 5) — minus already-elapsed time.
  // We don't track elapsed countdown at this layer (not started yet), so
  // the bonus is the full delayBeforeStart * 5.
  const bonus = Math.floor(next.delayBeforeStart * 5);
  if (bonus > 0) {
    w.credits += bonus;
    w.bus.emit('credits-changed', { credits: w.credits });
  }
  engine.startNextWave();
},
```

> Pre-wave countdown UI is intentionally deferred to a later iteration: the SEND button always awards the full bonus on press in v1. To wire a true elapsed-countdown later, store `nextWaveAvailableAt` on the world and decrement during sim; then bonus = `floor(remaining * 5)`.

- [ ] **Step 2: Commit**

```bash
git add src/render/useGameSession.ts
git commit -m "feat(render): SEND grants pre-wave bonus credits (v1: full delay)"
```

### Task F3: First-run tutorial overlay

**Files:**
- Create: `src/ui/components/TutorialOverlay.tsx`
- Modify: `src/app/screens/PlayScreen.tsx`

A scripted callout series that gates on `settings.tutorialSeen`.

- [ ] **Step 1: TutorialOverlay**

Create `src/ui/components/TutorialOverlay.tsx`:

```tsx
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSave } from '@/app/providers/SaveProvider';

const STEPS = [
  'Welcome to the netrunner sim. Defend the network from intrusions.',
  'Tap a tower in the bottom bar to buy. Tap a buildable tile to place.',
  'Tap SEND in the top bar to launch the next wave early — and earn bonus credits.',
  'Tap a placed tower to upgrade, sell, or change targeting priority.',
  'Earn shards by clearing levels — spend them in the Tech Tree to install upgrades.',
];

export function TutorialOverlay() {
  const { data, store, refresh } = useSave();
  const [step, setStep] = useState(0);
  if (data.settings.tutorialSeen) return null;

  const onNext = () => {
    if (step + 1 >= STEPS.length) {
      store.update((d) => { d.settings.tutorialSeen = true; });
      refresh();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <View style={styles.bg} pointerEvents="box-none">
      <View style={styles.card}>
        <Text style={styles.text}>{STEPS[step]}</Text>
        <Pressable onPress={onNext} style={styles.btn}>
          <Text style={styles.btnText}>{step + 1 >= STEPS.length ? 'GOT IT' : 'NEXT'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0E1AAA' },
  card: { padding: 20, margin: 24, borderColor: '#FFB347', borderWidth: 1, backgroundColor: '#0A0E1AEE', gap: 12, maxWidth: 360 },
  text: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 13, lineHeight: 20 },
  btn: { paddingVertical: 10, alignItems: 'center', borderColor: '#FFB347', borderWidth: 1 },
  btnText: { color: '#FFB347', fontFamily: 'monospace', fontSize: 12 },
});
```

- [ ] **Step 2: Add overlay to PlayScreen**

In `src/app/screens/PlayScreen.tsx`, add `<TutorialOverlay />` inside the root `<View>` after `<WavePreview />`:

```tsx
import { TutorialOverlay } from '@/ui/components/TutorialOverlay';
// ...
<TutorialOverlay />
```

- [ ] **Step 3: Verify**

Reset save, launch a match, walk through callouts, confirm `tutorialSeen` persists.

- [ ] **Step 4: Commit**

```bash
git add src/ui/components/TutorialOverlay.tsx src/app/screens/PlayScreen.tsx
git commit -m "feat(ui): first-run tutorial overlay"
```

### Task F4: Acceptance verification

**Files:** none (manual + automated runs).

Walk through each acceptance criterion in the spec and confirm. If any fails, file a fix task and resolve it before tagging.

- [ ] **Step 1: App boot on iOS + Android**

```bash
npx expo start --ios
npx expo start --android
```

Confirm: app launches on both, dark cyan boot, Title screen renders.

- [ ] **Step 2: Navigation flow without leaks**

Title → LevelSelect → Play (Easy) → win or lose → back to LevelSelect → repeat 5 times. Confirm: no crashes, no memory growth visible in Expo's dev tools.

- [ ] **Step 3: Full level 1 playable**

Reach the boss wave with all 3 tower types placed. Confirm: 3 towers · 4 enemies · 10 waves play out as designed.

- [ ] **Step 4: Difficulty selector affects the run**

Play the same level on Easy then Insane (back-to-back). Confirm: enemies feel tougher / weaker per the table; star and shard awards reflect the difficulty.

- [ ] **Step 5: Persistence across app restart**

Beat level 1 on Normal. Force-close the app. Reopen. Confirm: stars and shards still showing on LevelSelect / TechTree.

- [ ] **Step 6: Tech tree affects gameplay**

Unlock `tower.firewall.t1` in Tech Tree. Start a new match. Confirm: when a Firewall kills an enemy, a chained shot hits a second target visibly.

- [ ] **Step 7: Pause / speed / retry / exit**

In a match: pause; resume; switch to 2× and 3×; retry from Lose modal; exit-to-menu from Pause; verify each works without crashes.

- [ ] **Step 8: Audio**

With volumes at 100%, confirm wave-start, tower-placed, enemy-death SFX play (placeholder silent audio still triggers no errors). Music loop plays in-game (placeholder is silent — visible by audio-meter logging if desired).

- [ ] **Step 9: 60fps on Pixel 6 during heavy wave**

Use Android Studio Profiler or Expo's React DevTools Performance panel. Reach wave 6 (rush wave), have 5+ towers and 30+ enemies on screen. Confirm: sustained ≥55fps. If sub-50, profile Skia draw counts and revisit `MAX_ENEMIES`/`MAX_PROJECTILES` caps or pre-allocation.

- [ ] **Step 10: Engine tests + 100-seed determinism**

```bash
npm run test:engine
```

Confirm: all green, including the determinism spec.

- [ ] **Step 11: Tag the vertical slice**

```bash
git tag -a v0.1.0 -m "tower-gemax foundation v0.1.0 (vertical slice)"
git log --oneline -20
```

- [ ] **Step 12: Push (optional, only if a remote exists)**

```bash
# Only if a remote has been configured by the user.
git push origin main
git push origin --tags
```

---

## Phase F checkpoint

The foundation is shipped. The vertical slice is playable, persistent, deterministic, and tested. Future work (chapter 2 levels, more tower kinds, art polish, raster sprites, leaderboards, etc.) starts from this base.

