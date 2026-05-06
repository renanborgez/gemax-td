# GeMax TD

Cyberpunk netrunner tower defense, built in React Native (Expo SDK 55) with Skia + Reanimated 4. Repo / package name is `tower-gemax`; the user-facing product is **GeMax TD**.

A 10-chapter campaign (100 procedurally-generated missions) wrapped around a deterministic, vitest-tested simulation engine. Three-layer architecture: pure-TS sim → Skia render bridge → React UI.

## Setup

```bash
nvm use            # picks up .nvmrc (22.22.2)
npm install --legacy-peer-deps
npx expo start
```

## Locked dependency triple

The Skia / Reanimated / Expo SDK trio is fragile across minor bumps. The known-working pin:

- `expo@~55.0.0`
- `react-native@0.83.6`
- `react@19.2.0`
- `@shopify/react-native-skia@2.4.18`
- `react-native-reanimated@4.2.1`
- `react-native-worklets@>=0.7.0`

Bumping any of the above requires re-validating the others via `npx expo install --check`.

## Running tests

```bash
npm run test:engine    # pure TS engine, vitest, target <2s (47 specs)
npm test               # RN smoke, jest-expo (2 specs)
npm run preflight      # tsc + test:engine + lint:tsc:engine — gate before pushing
```

## EAS builds

```bash
npm run eas:build:dev                # internal dev build, both platforms
npm run eas:build:preview:ios        # preview channel iOS
npm run eas:build:preview:android    # preview channel Android
npm run eas:build:prod:ios           # store-bound iOS
npm run eas:build:prod:android       # store-bound Android
npm run eas:build:prod:all           # both production targets
npm run eas:submit:ios               # App Store submit
npm run eas:submit:android           # Play Store submit
```

## Brand assets

The app logo is authored as SVG and rasterized into the PNGs Expo expects.

- `assets/logo-mark.svg` — square master (1024×1024). Hexagonal containment ring, 3-tier angular tower, antenna pulse, signal arcs, base selection cell, corner brackets. Brand palette: cyan `#44EEFF`, mint `#7AFCC9`, orange `#FFB14E`, dark `#0E1014`.
- `assets/logo.svg` — full lockup (mark + "GeMax TD" wordmark) for splash / web headers.
- `src/ui/components/Logo.tsx` — Skia-rendered in-app component (`<Logo variant="mark|lockup" size={…} animate />`).

Regenerate the PNGs after editing the SVG master:

```bash
npm run gen:icons      # uses scripts/gen-icons.mjs (sharp devDep)
```

The script writes `icon.png` (1024), `adaptive-icon.png` (1024, inset to 70% safe zone, transparent surround), `splash-icon.png` (1024), `splash.png` (1024 dark plate, mark centered), `favicon.png` (256).

## Phase-A deviations from the original plan

These small adjustments were made while implementing Phase A; future contributors should know about them:

- **Node version:** the plan's `.nvmrc` originally said `20.11.1`, but the developer environment had Node `22.22.2`. The `.nvmrc` here matches reality (`22.22.2`).
- **`npm install --legacy-peer-deps`:** required for both `dependencies` and `devDependencies` installs because of a peer-dep conflict between `@types/react@19` (npm's preferred resolution) and `react-native@0.76.3`'s peer of `^18.2.6`. The `@types/react@18.3.12` pin we wanted is what ultimately got installed; the flag is purely an npm UX workaround. Re-run with the same flag whenever doing a fresh `npm install`.
- **`jest.config.js` `setupFiles`:** the plan specified the option `setupFilesAfterEach`, which Jest does not recognize. The actual option is `setupFiles`, which is what's wired here. `jest.mock()` calls in `jest.setup.ts` work correctly because modern Jest exposes `jest` globals to `setupFiles` as well.
- **`assets/splash.png`:** the Expo SDK 52 template ships `assets/splash-icon.png`, but the plan's `app.json` references `./assets/splash.png`. Resolved by copying `splash-icon.png` to `splash.png` (both files coexist in `assets/`). If a later Expo SDK upgrade changes the schema, this can be revisited.
- **`metro.config.js`:** the plan listed the file in the `git add` of A1 but didn't specify content. The repo carries Expo's default minimal `metro.config.js`.

## Project status

The codebase is well past the original Phase-A scaffold. Layers in place:

- **Engine** — fixed-timestep sim (`1/60`), seeded RNG, pooled projectiles, EventBus, deterministic; ~28 enemies / 15 towers / 11 projectile classes.
- **Content** — `src/content/levelGenerator.ts` deterministically builds the entire 100-mission catalog (10 chapters × 10 missions) from `(chapter, mission)` seeds. Hand-authored levels are no longer used.
- **Render** — Skia layers (`src/render/layers/`) read off a snapshot SharedValue. Idle-skip avoids waking worklets between waves.
- **UI** — 10 screens on a native-stack (`Title → Chapters → LevelSelect → Briefing → Play`, plus `Towers`, `Settings`, `Win`, `Lose`, `ChapterCleared` interstitial). HUD via zustand, bridged from the EventBus.
- **Audio** — pure-TS synth (oscillator/ADSR/noise/lowpass/mix) baked to PCM WAV, played via `expo-audio` round-robin pools. 22 SFX + 2 music tracks (menu/in-game).
- **Meta** — save schema at v6 (six chained migrations), three-slot loadout, chapter-clear gating on tower availability, per-chapter palettes, mastery medals, dev-only god mode.

## Reference docs

- Game design: [`docs/superpowers/specs/2026-05-04-tower-gemax-design.md`](docs/superpowers/specs/2026-05-04-tower-gemax-design.md)
- Original build plan: [`docs/superpowers/plans/2026-05-04-tower-gemax-foundation.md`](docs/superpowers/plans/2026-05-04-tower-gemax-foundation.md)
- Procedural SFX: [`docs/superpowers/specs/2026-05-04-procedural-sfx-design.md`](docs/superpowers/specs/2026-05-04-procedural-sfx-design.md), [`docs/superpowers/plans/2026-05-04-procedural-sfx.md`](docs/superpowers/plans/2026-05-04-procedural-sfx.md)
- Chapter progression: [`docs/superpowers/specs/2026-05-06-chapter-progression-design.md`](docs/superpowers/specs/2026-05-06-chapter-progression-design.md), [`docs/superpowers/plans/2026-05-06-chapter-progression.md`](docs/superpowers/plans/2026-05-06-chapter-progression.md)
- Day-to-day contributor guide: [`CLAUDE.md`](CLAUDE.md)
