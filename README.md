# tower-gemax

Cyberpunk netrunner tower defense, built in React Native (Expo).

See [`docs/superpowers/specs/2026-05-04-tower-gemax-design.md`](docs/superpowers/specs/2026-05-04-tower-gemax-design.md) for the design and [`docs/superpowers/plans/2026-05-04-tower-gemax-foundation.md`](docs/superpowers/plans/2026-05-04-tower-gemax-foundation.md) for the build plan.

## Setup

```bash
nvm use            # picks up .nvmrc (22.22.2)
npm install --legacy-peer-deps
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

## Phase-A deviations from the plan

These small adjustments were made while implementing Phase A; future contributors should know about them:

- **Node version:** the plan's `.nvmrc` originally said `20.11.1`, but the developer environment had Node `22.22.2`. The `.nvmrc` here matches reality (`22.22.2`).
- **`npm install --legacy-peer-deps`:** required for both `dependencies` and `devDependencies` installs because of a peer-dep conflict between `@types/react@19` (npm's preferred resolution) and `react-native@0.76.3`'s peer of `^18.2.6`. The `@types/react@18.3.12` pin we wanted is what ultimately got installed; the flag is purely a npm UX workaround. Re-run with the same flag whenever doing a fresh `npm install`.
- **`jest.config.js` `setupFiles`:** the plan specified the option `setupFilesAfterEach`, which Jest does not recognize. The actual option is `setupFiles`, which is what's wired here. `jest.mock()` calls in `jest.setup.ts` work correctly because modern Jest exposes `jest` globals to `setupFiles` as well.
- **`assets/splash.png`:** the Expo SDK 52 template ships `assets/splash-icon.png`, but the plan's `app.json` references `./assets/splash.png`. Resolved by copying `splash-icon.png` to `splash.png` (both files coexist in `assets/`). If a later Expo SDK upgrade changes the schema, this can be revisited.
- **`metro.config.js`:** the plan listed the file in the `git add` of A1 but didn't specify content. The repo carries Expo's default minimal `metro.config.js`.

## Project status

Phase A (scaffold) is complete. Phase B (engine, pure TS, vitest-tested) is next per the build plan.
