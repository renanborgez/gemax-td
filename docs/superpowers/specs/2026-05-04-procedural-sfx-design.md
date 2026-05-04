# Procedural SFX — Design Spec

**Date:** 2026-05-04
**Status:** Draft, pending implementation plan
**Scope:** Replace the silent-WAV placeholder for all 11 SFX keys with code-generated sounds. Music is out of scope.

## Goal

Make the game audible without shipping recorded audio assets. All SFX should be synthesized in TypeScript using a small set of primitives (oscillators, noise, envelopes, filters), pre-rendered to disk on first launch, and played through the existing `AudioManager` pool. The existing event wiring in `useGameSession.ts:93-113` and the catalog of SFX keys stay unchanged — only what plays for each key changes.

## Non-goals

- Real-time / per-shot synthesis at the audio-graph level (no `react-native-audio-api`, no new native modules).
- Music generation. The two `MusicKey` entries stay on their silent placeholder for this work.
- Spatial audio, mixing-bus DSP, or runtime parameter automation beyond a small playback-rate jitter.

## Aesthetic

Modern-synth / glitchy: sine + noise + short ADSR envelopes, occasional pitch sweeps, lightly low-pass-filtered noise tails. Not a chiptune homage — clean digital primitives that read as 2020s-indie-game rather than NES.

## Architecture

Four new files in `src/audio/`. Everything except `bake.ts` is RN-free pure TS so it can be tested under vitest.

```
src/audio/
  AudioManager.ts       # existing; init() gains an await bakeSfx() step
  catalog.ts            # existing; SFX_SOURCES replaced by SFX_KEYS list
  specs.ts              # NEW — declarative SoundSpec per SfxKey
  synth.ts              # NEW — pure-TS synthesis primitives over Float32Array
  wavEncoder.ts         # NEW — Float32Array → 16-bit PCM RIFF WAV (Uint8Array)
  bake.ts               # NEW — orchestrator: synth → encode → write to cache dir
  __tests__/
    synth.spec.ts       # NEW (vitest)
    wavEncoder.spec.ts  # NEW (vitest)
```

`bake.ts` is the only file that imports `expo-file-system`. `synth.ts`, `wavEncoder.ts`, and `specs.ts` import nothing platform-specific.

Layer-wise, everything stays inside the existing Layer-3 audio domain — no engine, render, or UI code is touched, and the engine determinism contract (`SeededRng`, fixed timestep) is unaffected.

## Data flow

```
App boots
  → AudioProvider mounts
  → AudioManager.init()
      → setAudioModeAsync(...)
      → bakeSfx() : Record<SfxKey, string>
          for each SfxKey:
            spec = SOUND_SPECS[key]
            specHash = fnv1a(canonicalJson(spec))
            path = `${cacheDirectory}sfx/${key}-${specHash}.wav`
            if !exists(path):
              pcm = renderSpec(spec)        # Float32Array @ 44.1 kHz mono
              wav = encodeWav(pcm)          # Uint8Array
              writeBinary(path, wav)
            uris[key] = `file://${path}`
      → for each SfxKey: createAudioPlayer({ uri: uris[key] }) × poolSize
  → AudioProvider.useEffect applies volumes
  → playSfx(key) round-robins as before, optionally sets playbackRate jitter
```

## Synthesis primitives (`synth.ts`)

All operate on mono `Float32Array` at a fixed `SAMPLE_RATE = 44100`.

| Function | Signature | Notes |
|---|---|---|
| `osc` | `(wave, freqStart, freqEnd, durationSec) → Float32Array` | sine / square / triangle / saw; linear pitch sweep when `freqEnd !== freqStart`; phase-continuous integration so sweeps are click-free |
| `noise` | `(durationSec, color, rng) → Float32Array` | `'white'` via `rng()`, `'pink'` via Voss-McCartney (8-octave) |
| `applyAdsr` | `(buf, { attack, decay, sustain, release }) → buf` | mutates in place; times in seconds; sustain is a 0..1 level |
| `lowpass` | `(buf, cutoffHz) → buf` | single-pole IIR; mutates in place |
| `mix` | `(buffers, gainsDb?) → Float32Array` | length = max(input lengths); shorter inputs are zero-padded; soft-clip via `tanh` to keep peaks ≤ 1.0 |
| `pad` | `(buf, totalSec) → Float32Array` | zero-pads tail so envelope releases are not truncated |
| `gain` | `(buf, db) → buf` | mutates in place |

**Determinism:** `synth.ts` exposes a small `mulberry32`-style `Rng` (separate instance from `engine/rng.ts` — same family, no shared state). `noise(...)` takes the rng explicitly. `renderSpec(spec)` seeds an rng from the spec's content hash so the same spec always produces byte-identical output.

## SoundSpec schema (`specs.ts`)

A `SoundSpec` is a declarative tree of layers. Each layer is one of:

```ts
type Layer =
  | { kind: 'osc'; wave: 'sine'|'square'|'tri'|'saw'; freqStart: number; freqEnd?: number; duration: number; envelope?: Adsr; gainDb?: number }
  | { kind: 'noise'; color: 'white'|'pink'; duration: number; envelope?: Adsr; lowpassHz?: number; gainDb?: number }
  | { kind: 'sequence'; offsets: number[]; layer: Layer };  // for arpeggios

type SoundSpec = { totalSec: number; layers: Layer[] };
```

`renderSpec(spec)` walks the layers, renders each into its own buffer, time-shifts sequence offsets, and `mix`es them into a `pad`-extended output of length `spec.totalSec`.

## Sound spec sketches

Starting points; the spec file is the source of truth and easy to tune by ear after the first bake.

| Key | Sketch | ~ms |
|---|---|---|
| `tower-fire-firewall` | white noise burst → LP @ 2 kHz, plus sine sub at 120 Hz; ADSR (2, 30, 0, 30) | 80 |
| `tower-fire-logic-bomb` | square sweep 200→60 Hz + noise pop on attack; slower release | 150 |
| `tower-fire-ice-lance` | sine sweep 300→1400 Hz + short noise tail; bright | 120 |
| `enemy-hit` | sine pip @ 800 Hz + noise click; sharp attack | 60 |
| `enemy-death` | sine sweep 400→100 Hz + LP-filtered noise tail | 250 |
| `wave-start` | two-note sine arpeggio 440→660 Hz | 300 |
| `life-lost` | square sweep 600→200 Hz | 200 |
| `win` | three-note major arpeggio (sine 523/659/784 Hz) | 500 |
| `lose` | descending sine triad 440/349/261 Hz | 800 |
| `ui-click` | 12 ms sine pip @ 1 kHz, sharp attack | 12 |
| `tower-placed` | sine rise 300→500 Hz, soft attack | 80 |

## WAV encoder (`wavEncoder.ts`)

`encodeWav(pcm: Float32Array, sampleRate = 44100): Uint8Array` produces a standard 16-bit PCM RIFF WAV: `RIFF` chunk, `fmt ` subchunk (PCM, 1 channel, sampleRate, byteRate, blockAlign, 16 bps), `data` subchunk with `Math.round(clamp(s, -1, 1) * 32767)` little-endian shorts. No external deps.

## Bake step (`bake.ts`)

```ts
export async function bakeSfx(): Promise<Record<SfxKey, string>>
```

1. Resolve `${FileSystem.cacheDirectory}sfx/` and create it if missing.
2. For each `SfxKey`, compute `specHash = fnv1a(canonicalJson(SOUND_SPECS[key]))`.
3. Target path = `${cacheDirectory}sfx/${key}-${specHash}.wav`. If already present, skip.
4. Otherwise `renderSpec(spec) → encodeWav → writeAsStringAsync(path, base64, { encoding: Base64 })` (or the equivalent `expo-file-system` write call current in SDK 55).
5. Return `{ [key]: 'file://' + path }`.

If any single key fails to write, log and fall back to a tiny in-memory silent buffer URI for that key only — match the existing AudioManager philosophy of "audio failure is non-fatal."

## AudioManager changes

```ts
async init(): Promise<void> {
  if (this.initialized) return;
  try { await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }); } catch {}
  const uris = await bakeSfx();
  for (const key of SFX_KEYS) {
    const players: AudioPlayer[] = [];
    const poolSize = SFX_POOL_SIZE[key];
    for (let i = 0; i < poolSize; i++) {
      try { players.push(createAudioPlayer({ uri: uris[key] })); } catch {}
    }
    this.sfxPools.set(key, { players, cursor: 0 });
  }
  this.initialized = true;
}
```

`playSfx(key)` gains an optional pre-play `player.playbackRate = 1 + (rng() - 0.5) * 0.06` on a small subset (`tower-fire-*`, `enemy-hit`, `enemy-death`, `ui-click`). If `expo-audio`'s `AudioPlayer` does not expose `playbackRate` in the runtime version pinned by SDK 55, drop the jitter for v1 — it's a tuning improvement, not a correctness requirement.

## Catalog changes (`catalog.ts`)

Replace `SFX_SOURCES` with `SFX_KEYS: readonly SfxKey[]`. `SfxKey` becomes the union derived from the keys themselves (or stays a string-literal union). `SFX_POOL_SIZE` is unchanged. `MUSIC_SOURCES` and `MusicKey` are unchanged. The `silent` require and the asset file are deleted.

## Cache & invalidation

- Files live in `${FileSystem.cacheDirectory}sfx/<key>-<specHash>.wav`. `cacheDirectory` is OS-evictable, which is acceptable: a missing file just triggers a re-bake on next launch.
- `specHash` is FNV-1a 32-bit over a canonical JSON form of the `SoundSpec` (sorted keys, no whitespace). Changing any field in a spec changes the filename, so bakes are content-addressed and never collide with stale renders.
- We do not proactively garbage-collect old hashes. The total footprint is bounded (11 small WAVs, each well under 100 KB) and the OS reclaims as needed.

## Tests

- `src/audio/__tests__/synth.spec.ts` (vitest)
  - Sample-count math: `osc('sine', 1000, 1000, 0.01)` returns 441 samples; peak ≈ 1.0; first sample ≈ 0; quarter-cycle sample ≈ 1.
  - ADSR boundaries: amplitude at end of attack ≈ 1.0, after decay ≈ sustain level, after release ≈ 0.
  - Determinism: rendering the same spec twice yields byte-identical `Float32Array`.
- `src/audio/__tests__/wavEncoder.spec.ts` (vitest)
  - Header round-trip: encode → parse first 44 bytes → assert sample rate 44100, 1 channel, 16 bps, even data length.
  - Body round-trip: a known Float32 input round-trips back to within ±1/32767 quantization tolerance.
- `bake.ts` has no unit test (thin glue over `expo-file-system`). Coverage of the synth and encoder makes this safe.
- **Vitest config update:** `vitest.config.ts` `test.include` must add `src/audio/**/*.spec.ts`. This is the only build-config change required.
- `tsconfig.engine.json` is **not** updated — `src/audio/` stays out of engine scope because `AudioManager.ts` and `bake.ts` import RN/Expo. The full-project `npm run tsc` covers the new files.

## Risks to verify during implementation

1. **`expo-audio` URI source form.** `createAudioPlayer({ uri })` should accept `file://` URIs on both iOS and Android. If a platform rejects it, fall back to passing the URI string directly, or to the `Asset.fromModule` flow — verified in the implementation phase, not the spec.
2. **`playbackRate` availability.** If `AudioPlayer` does not expose a writable `playbackRate` (or the equivalent setter) in the version pinned by SDK 55, drop per-shot jitter for v1.
3. **`expo-file-system` API on SDK 55.** The package was overhauled around this release; `bake.ts` must use the current async API (`writeAsStringAsync`, `getInfoAsync`, `makeDirectoryAsync`), not the deprecated synchronous form.

## Migration steps (summary)

1. Add `src/audio/{synth,wavEncoder,specs,bake}.ts` and the two test files.
2. Update `src/audio/catalog.ts`: drop `SFX_SOURCES` and the silent require; export `SFX_KEYS`. Keep `SfxKey`, `MusicKey`, `MUSIC_SOURCES`, `SFX_POOL_SIZE`.
3. Update `src/audio/AudioManager.ts`: `init()` awaits `bakeSfx()`; pool creation uses returned URIs; `playSfx` gets the optional `playbackRate` jitter (gated on capability).
4. Delete `src/audio/assets/silent-100ms.wav`.
5. Update `vitest.config.ts` to include `src/audio/**/*.spec.ts`.
6. No changes to `useGameSession.ts`, `AudioProvider.tsx`, or any UI / engine code.

## Acceptance

- All 11 SFX produce audible, distinguishable sounds on iOS and Android device builds.
- First-launch bake completes within a few hundred ms; subsequent launches hit the cache and skip synthesis.
- `npm run test:engine` includes the new audio specs and passes.
- `npm run tsc` is clean.
- The engine determinism test (`engine/__tests__/determinism.spec.ts`) still passes — proving the audio work didn't leak any non-determinism into the simulation.
