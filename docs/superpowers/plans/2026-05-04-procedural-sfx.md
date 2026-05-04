# Procedural SFX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace silent-WAV placeholders for all 11 SFX keys with code-generated sounds, baked to disk on first launch and played through the existing `AudioManager` pool.

**Architecture:** Pure-TS synthesis primitives (oscillators, noise, ADSR, lowpass) write Float32 PCM into a 16-bit RIFF WAV encoder; a bake step runs at `AudioManager.init()` time, persists each SFX into `${cacheDirectory}sfx/<key>-<specHash>.wav`, and hands file URIs to `expo-audio`'s `createAudioPlayer`. Music, engine code, and UI are untouched.

**Tech Stack:** TypeScript, Expo SDK 55 (`expo-audio` 55.0.14, `expo-file-system` 19.x), Vitest 2.1.8, `react-native` 0.83 (New Architecture). No new native modules.

**Spec:** `docs/superpowers/specs/2026-05-04-procedural-sfx-design.md`

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `src/audio/synth.ts` | NEW (pure TS) | Synthesis primitives (osc, noise, adsr, lowpass, mix, pad, gain) and `Rng` |
| `src/audio/wavEncoder.ts` | NEW (pure TS) | `encodeWav(pcm, sampleRate)` → 16-bit PCM RIFF `Uint8Array` |
| `src/audio/specs.ts` | NEW (pure TS) | `SoundSpec` types, `SOUND_SPECS` map, `renderSpec`, `specHash` |
| `src/audio/bake.ts` | NEW (RN) | `bakeSfx()`: write missing WAVs to cache dir, return URI map |
| `src/audio/AudioManager.ts` | MODIFY | `init()` awaits `bakeSfx()`; pool uses URIs; optional `playbackRate` jitter |
| `src/audio/catalog.ts` | MODIFY | Drop `SFX_SOURCES`, export `SFX_KEYS`; keep music + pool sizes |
| `src/audio/__tests__/wavEncoder.spec.ts` | NEW (vitest) | Encoder header + body round-trip |
| `src/audio/__tests__/synth.spec.ts` | NEW (vitest) | Primitives, ADSR, determinism |
| `src/audio/__tests__/specs.spec.ts` | NEW (vitest) | `renderSpec` produces stable bytes; `specHash` is stable |
| `src/audio/assets/silent-100ms.wav` | DELETE | No longer needed |
| `vitest.config.ts` | MODIFY | Add `src/audio/**/*.spec.ts` to include |
| `package.json` / `package-lock.json` | MODIFY | Add `expo-file-system` |

`tsconfig.engine.json` is **not** modified — `src/audio/` stays out of engine scope because `AudioManager.ts` and `bake.ts` import RN/Expo. The full-project `npm run tsc` covers everything.

---

### Task 1: Add `expo-file-system` dependency

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install via the Expo-aligned installer**

Run from repo root:

```bash
nvm use
npx expo install expo-file-system --legacy-peer-deps
```

`expo install` picks the version aligned with SDK 55 (19.x family). The `--legacy-peer-deps` flag is mandatory per `CLAUDE.md` — SDK 55 ships React 19, but several transitive packages still declare `react@^18` peers.

- [ ] **Step 2: Verify the lock-step**

Run: `npx expo install --check`
Expected: no version conflicts reported. If it suggests a different `expo-file-system` version, accept the suggestion (`npx expo install --fix --legacy-peer-deps`).

- [ ] **Step 3: Confirm the package surface**

Run: `node -e "console.log(Object.keys(require('expo-file-system/legacy')))"`
Expected: output includes `cacheDirectory`, `getInfoAsync`, `makeDirectoryAsync`, `writeAsStringAsync`, `EncodingType`. The `/legacy` import is the stable surface in SDK 55; the new `File`/`Directory` API can be migrated to later but is not used here.

If `/legacy` is unavailable in the installed version, fall back to the top-level import (`expo-file-system`) — the same names are re-exported in older 19.x releases. Note the working import path; later tasks reference it as `EXPO_FS_IMPORT`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add expo-file-system for procedural SFX bake"
```

---

### Task 2: Widen the vitest include glob

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Add `src/audio/**/*.spec.ts` to the include array**

Replace the `include` array in `vitest.config.ts` with:

```ts
include: [
  'src/lib/**/*.spec.ts',
  'src/engine/**/*.spec.ts',
  'src/world/**/*.spec.ts',
  'src/entities/**/*.spec.ts',
  'src/content/**/*.spec.ts',
  'src/difficulty/**/*.spec.ts',
  'src/meta/**/*.spec.ts',
  'src/ui/**/*.spec.ts',
  'src/audio/**/*.spec.ts',
],
```

- [ ] **Step 2: Verify the existing suite still discovers and passes**

Run: `npm run test:engine`
Expected: all existing specs still discovered, all green. No new specs to run yet.

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "test(audio): include src/audio in vitest discovery"
```

---

### Task 3: WAV encoder — failing test

**Files:**
- Create: `src/audio/__tests__/wavEncoder.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { encodeWav } from '@/audio/wavEncoder';

describe('encodeWav', () => {
  it('emits a valid 16-bit mono RIFF header at 44.1 kHz', () => {
    const pcm = new Float32Array(1000);
    const wav = encodeWav(pcm, 44100);
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);

    // RIFF header
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...wav.slice(8, 12))).toBe('WAVE');
    // 'fmt ' subchunk
    expect(String.fromCharCode(...wav.slice(12, 16))).toBe('fmt ');
    expect(view.getUint32(16, true)).toBe(16);          // PCM fmt chunk size
    expect(view.getUint16(20, true)).toBe(1);           // PCM format
    expect(view.getUint16(22, true)).toBe(1);           // mono
    expect(view.getUint32(24, true)).toBe(44100);       // sample rate
    expect(view.getUint32(28, true)).toBe(44100 * 2);   // byte rate
    expect(view.getUint16(32, true)).toBe(2);           // block align
    expect(view.getUint16(34, true)).toBe(16);          // bits per sample
    // 'data' subchunk
    expect(String.fromCharCode(...wav.slice(36, 40))).toBe('data');
    expect(view.getUint32(40, true)).toBe(pcm.length * 2);
    expect(wav.byteLength).toBe(44 + pcm.length * 2);
  });

  it('round-trips Float32 samples through 16-bit quantization', () => {
    const inputs = [0, 0.5, -0.5, 1, -1, 0.123];
    const pcm = new Float32Array(inputs);
    const wav = encodeWav(pcm, 44100);
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);

    for (let i = 0; i < inputs.length; i++) {
      const stored = view.getInt16(44 + i * 2, true);
      const decoded = stored / 32767;
      expect(decoded).toBeCloseTo(inputs[i]!, 4);
    }
  });

  it('clamps values outside [-1, 1]', () => {
    const pcm = new Float32Array([2, -2]);
    const wav = encodeWav(pcm, 44100);
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(46, true)).toBe(-32767);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm run test:engine -- src/audio/__tests__/wavEncoder.spec.ts`
Expected: FAIL — "Failed to resolve import '@/audio/wavEncoder'".

---

### Task 4: WAV encoder — implementation

**Files:**
- Create: `src/audio/wavEncoder.ts`

- [ ] **Step 1: Write the encoder**

```ts
/**
 * Encode mono Float32 PCM samples as a 16-bit PCM RIFF WAV (Uint8Array).
 * Values are clamped to [-1, 1] and quantized to int16 via *32767.
 */
export function encodeWav(pcm: Float32Array, sampleRate: number): Uint8Array {
  const dataBytes = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);

  // 'RIFF' <size> 'WAVE'
  writeAscii(u8, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(u8, 8, 'WAVE');

  // 'fmt ' subchunk
  writeAscii(u8, 12, 'fmt ');
  view.setUint32(16, 16, true);          // PCM chunk size
  view.setUint16(20, 1, true);           // format = PCM
  view.setUint16(22, 1, true);           // channels = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byteRate (mono * 16-bit)
  view.setUint16(32, 2, true);           // blockAlign
  view.setUint16(34, 16, true);          // bitsPerSample

  // 'data' subchunk
  writeAscii(u8, 36, 'data');
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let i = 0; i < pcm.length; i++) {
    const s = pcm[i]!;
    const clamped = s > 1 ? 1 : s < -1 ? -1 : s;
    view.setInt16(offset, Math.round(clamped * 32767), true);
    offset += 2;
  }
  return u8;
}

function writeAscii(u8: Uint8Array, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) u8[offset + i] = text.charCodeAt(i);
}
```

- [ ] **Step 2: Run and confirm green**

Run: `npm run test:engine -- src/audio/__tests__/wavEncoder.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 3: Commit**

```bash
git add src/audio/wavEncoder.ts src/audio/__tests__/wavEncoder.spec.ts
git commit -m "feat(audio): pure-TS 16-bit PCM WAV encoder"
```

---

### Task 5: Synth primitives — `osc` and `Rng`

**Files:**
- Create: `src/audio/synth.ts` (initial version, more added later)
- Create: `src/audio/__tests__/synth.spec.ts`

- [ ] **Step 1: Write the failing tests**

`src/audio/__tests__/synth.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { osc, makeRng, SAMPLE_RATE } from '@/audio/synth';

describe('SAMPLE_RATE', () => {
  it('is 44100', () => {
    expect(SAMPLE_RATE).toBe(44100);
  });
});

describe('osc', () => {
  it('returns the right sample count for a fixed-frequency tone', () => {
    const buf = osc('sine', 1000, 1000, 0.01);
    expect(buf).toBeInstanceOf(Float32Array);
    expect(buf.length).toBe(441);
  });

  it('starts a sine at zero with peak near 1.0', () => {
    const buf = osc('sine', 1000, 1000, 0.01);
    expect(buf[0]).toBeCloseTo(0, 4);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]!));
    expect(peak).toBeGreaterThan(0.99);
    expect(peak).toBeLessThanOrEqual(1.0001);
  });

  it('produces square waves bounded to ±1', () => {
    const buf = osc('square', 500, 500, 0.01);
    for (let i = 0; i < buf.length; i++) expect(Math.abs(buf[i]!)).toBeCloseTo(1, 6);
  });

  it('sweeps frequency linearly without phase discontinuities', () => {
    const buf = osc('sine', 100, 200, 0.05);
    // No sample-to-sample jump should exceed roughly 2π·fmax/sr in amplitude (~0.03)
    let maxJump = 0;
    for (let i = 1; i < buf.length; i++) maxJump = Math.max(maxJump, Math.abs(buf[i]! - buf[i - 1]!));
    expect(maxJump).toBeLessThan(0.05);
  });
});

describe('makeRng', () => {
  it('is deterministic for the same seed', () => {
    const a = makeRng(0xdeadbeef);
    const b = makeRng(0xdeadbeef);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it('produces values in [0, 1)', () => {
    const r = makeRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm run test:engine -- src/audio/__tests__/synth.spec.ts`
Expected: FAIL — "Failed to resolve import '@/audio/synth'".

- [ ] **Step 3: Implement `osc` and `Rng` in `src/audio/synth.ts`**

```ts
export const SAMPLE_RATE = 44100;
export type Wave = 'sine' | 'square' | 'tri' | 'saw';
export type Rng = () => number;

/** mulberry32 — same family as engine/rng.ts but a fresh, audio-local instance. */
export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate `durationSec` of `wave` with frequency sweeping linearly from
 * `freqStart` to `freqEnd`. Phase is integrated sample-by-sample so sweeps
 * have no discontinuities at sample boundaries.
 */
export function osc(wave: Wave, freqStart: number, freqEnd: number, durationSec: number): Float32Array {
  const n = Math.max(0, Math.round(durationSec * SAMPLE_RATE));
  const out = new Float32Array(n);
  if (n === 0) return out;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const freq = freqStart + (freqEnd - freqStart) * t;
    out[i] = sample(wave, phase);
    phase += freq / SAMPLE_RATE;
    if (phase >= 1) phase -= Math.floor(phase);
  }
  return out;
}

function sample(wave: Wave, phase: number): number {
  switch (wave) {
    case 'sine':   return Math.sin(2 * Math.PI * phase);
    case 'square': return phase < 0.5 ? 1 : -1;
    case 'tri':    return 4 * Math.abs(phase - 0.5) - 1;
    case 'saw':    return 2 * phase - 1;
  }
}
```

- [ ] **Step 4: Run and confirm green**

Run: `npm run test:engine -- src/audio/__tests__/synth.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/audio/synth.ts src/audio/__tests__/synth.spec.ts
git commit -m "feat(audio): osc primitive and seeded RNG"
```

---

### Task 6: Synth primitives — `noise` and `applyAdsr`

**Files:**
- Modify: `src/audio/synth.ts`
- Modify: `src/audio/__tests__/synth.spec.ts`

- [ ] **Step 1: Append failing tests**

Append to `src/audio/__tests__/synth.spec.ts`:

```ts
import { noise, applyAdsr } from '@/audio/synth';

describe('noise', () => {
  it('returns the right length for the requested duration', () => {
    const buf = noise(0.01, 'white', makeRng(1));
    expect(buf.length).toBe(441);
  });

  it('keeps white-noise samples bounded in [-1, 1]', () => {
    const buf = noise(0.05, 'white', makeRng(7));
    for (let i = 0; i < buf.length; i++) {
      expect(buf[i]!).toBeGreaterThanOrEqual(-1);
      expect(buf[i]!).toBeLessThanOrEqual(1);
    }
  });

  it('keeps pink-noise samples bounded in [-1, 1]', () => {
    const buf = noise(0.05, 'pink', makeRng(7));
    for (let i = 0; i < buf.length; i++) {
      expect(buf[i]!).toBeGreaterThanOrEqual(-1);
      expect(buf[i]!).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic given the same RNG seed', () => {
    const a = noise(0.01, 'white', makeRng(42));
    const b = noise(0.01, 'white', makeRng(42));
    for (let i = 0; i < a.length; i++) expect(a[i]).toBe(b[i]);
  });
});

describe('applyAdsr', () => {
  it('shapes the envelope at boundary samples', () => {
    const buf = new Float32Array(SAMPLE_RATE).fill(1); // 1 second of DC
    applyAdsr(buf, { attack: 0.1, decay: 0.1, sustain: 0.5, release: 0.1 });
    // start: 0
    expect(buf[0]!).toBeCloseTo(0, 4);
    // end of attack (~0.1s): peak ≈ 1
    expect(buf[Math.round(SAMPLE_RATE * 0.1) - 1]!).toBeCloseTo(1, 2);
    // end of decay (~0.2s): sustain level ≈ 0.5
    expect(buf[Math.round(SAMPLE_RATE * 0.2)]!).toBeCloseTo(0.5, 2);
    // mid-sustain (~0.5s): still ≈ 0.5
    expect(buf[Math.round(SAMPLE_RATE * 0.5)]!).toBeCloseTo(0.5, 2);
    // end of release (~1.0s, last sample): ≈ 0
    expect(buf[buf.length - 1]!).toBeCloseTo(0, 2);
  });

  it('returns the same buffer (mutates in place)', () => {
    const buf = new Float32Array(100).fill(1);
    const ret = applyAdsr(buf, { attack: 0.001, decay: 0.001, sustain: 0.5, release: 0.001 });
    expect(ret).toBe(buf);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm run test:engine -- src/audio/__tests__/synth.spec.ts`
Expected: FAIL — `noise` and `applyAdsr` are not exported from `@/audio/synth`.

- [ ] **Step 3: Implement in `src/audio/synth.ts`**

Append:

```ts
export type NoiseColor = 'white' | 'pink';

export function noise(durationSec: number, color: NoiseColor, rng: Rng): Float32Array {
  const n = Math.max(0, Math.round(durationSec * SAMPLE_RATE));
  const out = new Float32Array(n);
  if (color === 'white') {
    for (let i = 0; i < n; i++) out[i] = rng() * 2 - 1;
    return out;
  }
  // Voss-McCartney pink noise (8 octaves)
  const rows = new Float32Array(8);
  for (let i = 0; i < 8; i++) rows[i] = rng() * 2 - 1;
  let runningSum = rows.reduce((a, b) => a + b, 0);
  let counter = 0;
  for (let i = 0; i < n; i++) {
    counter = (counter + 1) | 0;
    let row = 0;
    while ((counter & (1 << row)) === 0 && row < 8) row++;
    if (row < 8) {
      const next = rng() * 2 - 1;
      runningSum += next - rows[row]!;
      rows[row] = next;
    }
    // Normalize: 8 sources sum into ±8 range; divide to keep ≤ 1.
    out[i] = runningSum / 8;
  }
  return out;
}

export type Adsr = { attack: number; decay: number; sustain: number; release: number };

/** Apply an ADSR amplitude envelope in place. Times in seconds; sustain is a 0..1 level. */
export function applyAdsr(buf: Float32Array, env: Adsr): Float32Array {
  const n = buf.length;
  if (n === 0) return buf;
  const a = Math.max(1, Math.round(env.attack * SAMPLE_RATE));
  const d = Math.max(1, Math.round(env.decay * SAMPLE_RATE));
  const r = Math.max(1, Math.round(env.release * SAMPLE_RATE));
  const sustainStart = Math.min(n, a + d);
  const releaseStart = Math.max(sustainStart, n - r);
  for (let i = 0; i < n; i++) {
    let g: number;
    if (i < a) {
      g = i / (a - 1 || 1);
    } else if (i < sustainStart) {
      const t = (i - a) / (d - 1 || 1);
      g = 1 - (1 - env.sustain) * t;
    } else if (i < releaseStart) {
      g = env.sustain;
    } else {
      const t = (i - releaseStart) / (n - releaseStart - 1 || 1);
      g = env.sustain * (1 - t);
    }
    buf[i] = buf[i]! * g;
  }
  return buf;
}
```

- [ ] **Step 4: Run and confirm green**

Run: `npm run test:engine -- src/audio/__tests__/synth.spec.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add src/audio/synth.ts src/audio/__tests__/synth.spec.ts
git commit -m "feat(audio): noise and ADSR primitives"
```

---

### Task 7: Synth primitives — `lowpass`, `mix`, `pad`, `gain`

**Files:**
- Modify: `src/audio/synth.ts`
- Modify: `src/audio/__tests__/synth.spec.ts`

- [ ] **Step 1: Append failing tests**

Append to `src/audio/__tests__/synth.spec.ts`:

```ts
import { lowpass, mix, pad, gain } from '@/audio/synth';

describe('lowpass', () => {
  it('returns the same buffer (mutates in place)', () => {
    const buf = new Float32Array(100).fill(1);
    const ret = lowpass(buf, 1000);
    expect(ret).toBe(buf);
  });

  it('attenuates a high-frequency tone more than a low-frequency tone', () => {
    const high = osc('sine', 8000, 8000, 0.05);
    const low = osc('sine', 200, 200, 0.05);
    lowpass(high, 1000);
    lowpass(low, 1000);
    const peak = (b: Float32Array) => {
      let m = 0;
      for (let i = 0; i < b.length; i++) m = Math.max(m, Math.abs(b[i]!));
      return m;
    };
    expect(peak(high)).toBeLessThan(peak(low));
  });
});

describe('mix', () => {
  it('sums shorter buffers into a longer output without attenuating in-range values', () => {
    const a = new Float32Array([0.5, 0.5, 0.5, 0.5]);
    const b = new Float32Array([0.5, 0.5]);
    const out = mix([a, b]);
    expect(out.length).toBe(4);
    // First two samples sum to 1.0 — within range, passed through unchanged.
    expect(out[0]!).toBeCloseTo(1, 6);
    expect(out[1]!).toBeCloseTo(1, 6);
    // Third sample is the tail of `a` only — unchanged.
    expect(out[2]!).toBeCloseTo(0.5, 6);
  });

  it('soft-clips only when the summed value exceeds ±1', () => {
    const a = new Float32Array([2, -2]);
    const out = mix([a]);
    // Out-of-range: clipped via tanh.
    expect(out[0]!).toBeCloseTo(Math.tanh(2), 4);
    expect(out[1]!).toBeCloseTo(-Math.tanh(2), 4);
    expect(Math.abs(out[0]!)).toBeLessThan(1);
  });

  it('applies per-buffer gainsDb (in-range stays linear)', () => {
    const a = new Float32Array([1]);
    const out = mix([a], [-6]); // -6 dB ≈ 0.501
    expect(out[0]!).toBeCloseTo(0.501, 3);
  });
});

describe('pad', () => {
  it('zero-pads the tail to reach totalSec', () => {
    const a = new Float32Array([1, 1]);
    const out = pad(a, 0.001); // 44 samples at 44.1 kHz
    expect(out.length).toBe(44);
    expect(out[0]).toBe(1);
    expect(out[1]).toBe(1);
    expect(out[2]).toBe(0);
    expect(out[43]).toBe(0);
  });

  it('does not truncate when input is already longer', () => {
    const a = new Float32Array(1000).fill(1);
    const out = pad(a, 0.001);
    expect(out.length).toBe(1000);
  });
});

describe('gain', () => {
  it('scales by dB in place', () => {
    const buf = new Float32Array([1]);
    gain(buf, -6);
    expect(buf[0]!).toBeCloseTo(0.501, 3);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm run test:engine -- src/audio/__tests__/synth.spec.ts`
Expected: FAIL — `lowpass`, `mix`, `pad`, `gain` not exported.

- [ ] **Step 3: Implement in `src/audio/synth.ts`**

Append:

```ts
/** Single-pole IIR lowpass; mutates in place. */
export function lowpass(buf: Float32Array, cutoffHz: number): Float32Array {
  if (buf.length === 0) return buf;
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / SAMPLE_RATE;
  const alpha = dt / (rc + dt);
  let prev = buf[0]!;
  for (let i = 0; i < buf.length; i++) {
    prev = prev + alpha * (buf[i]! - prev);
    buf[i] = prev;
  }
  return buf;
}

/**
 * Sum buffers (zero-padded to max length). Pass-through when |sum| ≤ 1;
 * soft-clip via tanh only on samples that exceed the range. Single-layer
 * mixes therefore preserve full headroom.
 */
export function mix(buffers: Float32Array[], gainsDb?: number[]): Float32Array {
  let maxLen = 0;
  for (const b of buffers) maxLen = Math.max(maxLen, b.length);
  const out = new Float32Array(maxLen);
  for (let bi = 0; bi < buffers.length; bi++) {
    const buf = buffers[bi]!;
    const g = gainsDb && gainsDb[bi] !== undefined ? Math.pow(10, gainsDb[bi]! / 20) : 1;
    for (let i = 0; i < buf.length; i++) out[i] += buf[i]! * g;
  }
  for (let i = 0; i < out.length; i++) {
    const s = out[i]!;
    if (s > 1 || s < -1) out[i] = Math.tanh(s);
  }
  return out;
}

/** Right-pad a buffer with zeros so its length covers `totalSec`. */
export function pad(buf: Float32Array, totalSec: number): Float32Array {
  const target = Math.max(0, Math.round(totalSec * SAMPLE_RATE));
  if (buf.length >= target) return buf;
  const out = new Float32Array(target);
  out.set(buf, 0);
  return out;
}

/** Scale a buffer by `db` in place. */
export function gain(buf: Float32Array, db: number): Float32Array {
  const g = Math.pow(10, db / 20);
  for (let i = 0; i < buf.length; i++) buf[i] = buf[i]! * g;
  return buf;
}
```

- [ ] **Step 4: Run and confirm green**

Run: `npm run test:engine -- src/audio/__tests__/synth.spec.ts`
Expected: PASS (all primitives).

- [ ] **Step 5: Commit**

```bash
git add src/audio/synth.ts src/audio/__tests__/synth.spec.ts
git commit -m "feat(audio): lowpass, mix, pad, gain primitives"
```

---

### Task 8: SoundSpec types, `renderSpec`, `specHash`

**Files:**
- Create: `src/audio/specs.ts`
- Create: `src/audio/__tests__/specs.spec.ts`

- [ ] **Step 1: Write the failing tests**

`src/audio/__tests__/specs.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { SoundSpec } from '@/audio/specs';
import { renderSpec, specHash, SOUND_SPECS } from '@/audio/specs';
import { SAMPLE_RATE } from '@/audio/synth';

describe('renderSpec', () => {
  it('renders a single-osc spec to the right length', () => {
    const spec: SoundSpec = {
      totalSec: 0.05,
      layers: [{ kind: 'osc', wave: 'sine', freqStart: 1000, duration: 0.05 }],
    };
    const out = renderSpec(spec);
    expect(out.length).toBe(Math.round(0.05 * SAMPLE_RATE));
  });

  it('is deterministic for the same spec', () => {
    const spec: SoundSpec = {
      totalSec: 0.05,
      layers: [
        { kind: 'osc', wave: 'sine', freqStart: 500, duration: 0.05 },
        { kind: 'noise', color: 'white', duration: 0.05 },
      ],
    };
    const a = renderSpec(spec);
    const b = renderSpec(spec);
    for (let i = 0; i < a.length; i++) expect(a[i]).toBe(b[i]);
  });

  it('time-shifts sequence offsets', () => {
    const spec: SoundSpec = {
      totalSec: 0.1,
      layers: [{
        kind: 'sequence',
        offsets: [0, 0.05],
        layer: { kind: 'osc', wave: 'sine', freqStart: 1000, duration: 0.005 },
      }],
    };
    const out = renderSpec(spec);
    // First pip energy is in the first ~220 samples; second pip starts at sample ~2205.
    const energy = (start: number, end: number) => {
      let e = 0;
      for (let i = start; i < end; i++) e += out[i]! * out[i]!;
      return e;
    };
    const firstWindow = energy(0, 220);
    const gapWindow = energy(500, 2000);
    const secondWindow = energy(2205, 2425);
    expect(firstWindow).toBeGreaterThan(gapWindow);
    expect(secondWindow).toBeGreaterThan(gapWindow);
  });
});

describe('specHash', () => {
  it('is stable across calls', () => {
    const s = SOUND_SPECS['ui-click'];
    expect(specHash(s)).toBe(specHash(s));
  });

  it('differs when any field changes', () => {
    const a: SoundSpec = { totalSec: 0.01, layers: [{ kind: 'osc', wave: 'sine', freqStart: 1000, duration: 0.01 }] };
    const b: SoundSpec = { totalSec: 0.01, layers: [{ kind: 'osc', wave: 'sine', freqStart: 1001, duration: 0.01 }] };
    expect(specHash(a)).not.toBe(specHash(b));
  });

  it('produces an 8-character lowercase hex string', () => {
    const h = specHash(SOUND_SPECS['ui-click']);
    expect(h).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('SOUND_SPECS', () => {
  it('covers all 11 SFX keys', () => {
    const expected = [
      'tower-fire-firewall', 'tower-fire-logic-bomb', 'tower-fire-ice-lance',
      'enemy-hit', 'enemy-death', 'wave-start', 'life-lost', 'win', 'lose',
      'ui-click', 'tower-placed',
    ] as const;
    for (const k of expected) expect(SOUND_SPECS[k]).toBeDefined();
    expect(Object.keys(SOUND_SPECS).sort()).toEqual([...expected].sort());
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm run test:engine -- src/audio/__tests__/specs.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/audio/specs.ts`**

```ts
import type { SfxKey } from '@/audio/catalog';
import {
  SAMPLE_RATE, makeRng, osc, noise, applyAdsr, lowpass, mix, pad, gain,
  type Wave, type NoiseColor, type Adsr,
} from '@/audio/synth';

export type OscLayer = {
  kind: 'osc';
  wave: Wave;
  freqStart: number;
  freqEnd?: number;
  duration: number;
  envelope?: Adsr;
  gainDb?: number;
};

export type NoiseLayer = {
  kind: 'noise';
  color: NoiseColor;
  duration: number;
  envelope?: Adsr;
  lowpassHz?: number;
  gainDb?: number;
};

export type SequenceLayer = {
  kind: 'sequence';
  offsets: number[]; // seconds
  layer: OscLayer | NoiseLayer;
};

export type Layer = OscLayer | NoiseLayer | SequenceLayer;

export type SoundSpec = {
  totalSec: number;
  layers: Layer[];
};

/** FNV-1a 32-bit over a canonical-JSON form of the spec. Returns 8-char lowercase hex. */
export function specHash(spec: SoundSpec): string {
  const json = canonicalJson(spec);
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJson((value as Record<string, unknown>)[k])).join(',') + '}';
}

export function renderSpec(spec: SoundSpec): Float32Array {
  // Seed an audio-local RNG from the spec's hash so the same spec is byte-identical across runs.
  const seed = parseInt(specHash(spec), 16) >>> 0;
  const rng = makeRng(seed);
  const buffers: Float32Array[] = [];
  for (const layer of spec.layers) collectLayer(layer, 0, buffers, rng);
  const mixed = mix(buffers);
  return pad(mixed, spec.totalSec);
}

function collectLayer(layer: Layer, offsetSec: number, out: Float32Array[], rng: () => number): void {
  if (layer.kind === 'sequence') {
    for (const off of layer.offsets) collectLayer(layer.layer, offsetSec + off, out, rng);
    return;
  }
  const buf = renderLeaf(layer, rng);
  if (offsetSec === 0) { out.push(buf); return; }
  const offSamples = Math.round(offsetSec * SAMPLE_RATE);
  const shifted = new Float32Array(offSamples + buf.length);
  shifted.set(buf, offSamples);
  out.push(shifted);
}

function renderLeaf(layer: OscLayer | NoiseLayer, rng: () => number): Float32Array {
  let buf: Float32Array;
  if (layer.kind === 'osc') {
    buf = osc(layer.wave, layer.freqStart, layer.freqEnd ?? layer.freqStart, layer.duration);
  } else {
    buf = noise(layer.duration, layer.color, rng);
    if (layer.lowpassHz !== undefined) lowpass(buf, layer.lowpassHz);
  }
  if (layer.envelope) applyAdsr(buf, layer.envelope);
  if (layer.gainDb !== undefined) gain(buf, layer.gainDb);
  return buf;
}

export const SOUND_SPECS: Readonly<Record<SfxKey, SoundSpec>> = {
  'tower-fire-firewall': {
    totalSec: 0.10,
    layers: [
      { kind: 'noise', color: 'white', duration: 0.06, lowpassHz: 2000,
        envelope: { attack: 0.002, decay: 0.030, sustain: 0, release: 0.030 } },
      { kind: 'osc', wave: 'sine', freqStart: 120, freqEnd: 80, duration: 0.06,
        envelope: { attack: 0.002, decay: 0.030, sustain: 0, release: 0.030 }, gainDb: -3 },
    ],
  },
  'tower-fire-logic-bomb': {
    totalSec: 0.18,
    layers: [
      { kind: 'osc', wave: 'square', freqStart: 200, freqEnd: 60, duration: 0.15,
        envelope: { attack: 0.002, decay: 0.060, sustain: 0.2, release: 0.080 }, gainDb: -6 },
      { kind: 'noise', color: 'white', duration: 0.04, lowpassHz: 1500,
        envelope: { attack: 0.001, decay: 0.020, sustain: 0, release: 0.020 } },
    ],
  },
  'tower-fire-ice-lance': {
    totalSec: 0.14,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 300, freqEnd: 1400, duration: 0.10,
        envelope: { attack: 0.001, decay: 0.040, sustain: 0.3, release: 0.060 } },
      { kind: 'noise', color: 'white', duration: 0.06, lowpassHz: 4000,
        envelope: { attack: 0.001, decay: 0.030, sustain: 0, release: 0.030 }, gainDb: -10 },
    ],
  },
  'enemy-hit': {
    totalSec: 0.07,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 800, duration: 0.05,
        envelope: { attack: 0.001, decay: 0.020, sustain: 0, release: 0.030 } },
      { kind: 'noise', color: 'white', duration: 0.02, lowpassHz: 3000,
        envelope: { attack: 0.001, decay: 0.010, sustain: 0, release: 0.010 }, gainDb: -6 },
    ],
  },
  'enemy-death': {
    totalSec: 0.30,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 400, freqEnd: 100, duration: 0.25,
        envelope: { attack: 0.005, decay: 0.080, sustain: 0.3, release: 0.150 } },
      { kind: 'noise', color: 'pink', duration: 0.20, lowpassHz: 1200,
        envelope: { attack: 0.005, decay: 0.080, sustain: 0.1, release: 0.120 }, gainDb: -10 },
    ],
  },
  'wave-start': {
    totalSec: 0.35,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 440, duration: 0.12,
        envelope: { attack: 0.005, decay: 0.040, sustain: 0.3, release: 0.060 } },
      { kind: 'sequence', offsets: [0.15], layer: {
        kind: 'osc', wave: 'sine', freqStart: 660, duration: 0.18,
        envelope: { attack: 0.005, decay: 0.060, sustain: 0.3, release: 0.100 },
      }},
    ],
  },
  'life-lost': {
    totalSec: 0.25,
    layers: [
      { kind: 'osc', wave: 'square', freqStart: 600, freqEnd: 200, duration: 0.20,
        envelope: { attack: 0.002, decay: 0.040, sustain: 0.4, release: 0.150 }, gainDb: -6 },
    ],
  },
  'win': {
    totalSec: 0.55,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 523, duration: 0.15,
        envelope: { attack: 0.005, decay: 0.040, sustain: 0.5, release: 0.090 } },
      { kind: 'sequence', offsets: [0.15], layer: {
        kind: 'osc', wave: 'sine', freqStart: 659, duration: 0.15,
        envelope: { attack: 0.005, decay: 0.040, sustain: 0.5, release: 0.090 },
      }},
      { kind: 'sequence', offsets: [0.30], layer: {
        kind: 'osc', wave: 'sine', freqStart: 784, duration: 0.20,
        envelope: { attack: 0.005, decay: 0.040, sustain: 0.5, release: 0.150 },
      }},
    ],
  },
  'lose': {
    totalSec: 0.85,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 440, duration: 0.25,
        envelope: { attack: 0.010, decay: 0.060, sustain: 0.5, release: 0.150 } },
      { kind: 'sequence', offsets: [0.25], layer: {
        kind: 'osc', wave: 'sine', freqStart: 349, duration: 0.25,
        envelope: { attack: 0.010, decay: 0.060, sustain: 0.5, release: 0.150 },
      }},
      { kind: 'sequence', offsets: [0.50], layer: {
        kind: 'osc', wave: 'sine', freqStart: 261, duration: 0.30,
        envelope: { attack: 0.010, decay: 0.060, sustain: 0.5, release: 0.220 },
      }},
    ],
  },
  'ui-click': {
    totalSec: 0.025,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 1000, duration: 0.012,
        envelope: { attack: 0.001, decay: 0.005, sustain: 0, release: 0.005 } },
    ],
  },
  'tower-placed': {
    totalSec: 0.10,
    layers: [
      { kind: 'osc', wave: 'sine', freqStart: 300, freqEnd: 500, duration: 0.08,
        envelope: { attack: 0.005, decay: 0.020, sustain: 0.4, release: 0.040 } },
    ],
  },
};
```

- [ ] **Step 4: Run and confirm green**

Run: `npm run test:engine -- src/audio/__tests__/specs.spec.ts`
Expected: PASS (all 6 tests).

Note: this task imports `SfxKey` from `@/audio/catalog`. The current `catalog.ts` exports `SfxKey` as a union derived from `SFX_SOURCES`. Task 9 swaps that to `SFX_KEYS`-derived but keeps the union shape, so the import here keeps working before and after Task 9.

- [ ] **Step 5: Commit**

```bash
git add src/audio/specs.ts src/audio/__tests__/specs.spec.ts
git commit -m "feat(audio): SoundSpec schema, renderSpec, FNV-1a content hash, 11 SFX specs"
```

---

### Task 9: Catalog — replace `SFX_SOURCES` with `SFX_KEYS`

**Files:**
- Modify: `src/audio/catalog.ts`

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/audio/catalog.ts` with:

```ts
// SFX keys are content-addressed and synthesized at runtime — see specs.ts and bake.ts.
// Music sources still point to a silent placeholder; music generation is out of scope.
const silent = require('./assets/silent-100ms.wav');

export const SFX_KEYS = [
  'tower-fire-firewall',
  'tower-fire-logic-bomb',
  'tower-fire-ice-lance',
  'enemy-hit',
  'enemy-death',
  'wave-start',
  'life-lost',
  'win',
  'lose',
  'ui-click',
  'tower-placed',
] as const;
export type SfxKey = typeof SFX_KEYS[number];

export const MUSIC_SOURCES = {
  'main-menu': silent,
  'in-game':   silent,
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

Note: `silent-100ms.wav` is still required here for the music keys. Music replacement is out of scope for this plan, so the file stays — Task 13 only updates the comment to make that explicit.

- [ ] **Step 2: Run typecheck and tests to verify nothing broke**

Run: `npm run tsc`
Expected: clean.

Run: `npm run test:engine`
Expected: all green (synth + specs + existing).

- [ ] **Step 3: Commit**

```bash
git add src/audio/catalog.ts
git commit -m "refactor(audio): replace SFX_SOURCES with SFX_KEYS list"
```

---

### Task 10: Bake module

**Files:**
- Create: `src/audio/bake.ts`

`bake.ts` is a thin orchestrator over `expo-file-system`. It is **not** unit-tested in vitest (RN-only API surface). Verification is via the full app launch in Task 14.

- [ ] **Step 1: Write the bake module**

Use the import path verified in Task 1, Step 3. Default: `expo-file-system/legacy`.

```ts
import {
  cacheDirectory, getInfoAsync, makeDirectoryAsync, writeAsStringAsync, EncodingType,
} from 'expo-file-system/legacy';
import { SFX_KEYS, type SfxKey } from '@/audio/catalog';
import { SOUND_SPECS, renderSpec, specHash } from '@/audio/specs';
import { encodeWav } from '@/audio/wavEncoder';
import { SAMPLE_RATE } from '@/audio/synth';

/**
 * Bake every SFX to `${cacheDirectory}sfx/<key>-<specHash>.wav` if missing,
 * and return a map of key → file URI. Failures for individual keys fall back
 * to a tiny empty-WAV URI so `playSfx` never throws — silence-on-error matches
 * the AudioManager's existing "audio failure is non-fatal" philosophy.
 */
export async function bakeSfx(): Promise<Record<SfxKey, string>> {
  const baseDir = (cacheDirectory ?? '') + 'sfx/';
  try {
    const info = await getInfoAsync(baseDir);
    if (!info.exists) await makeDirectoryAsync(baseDir, { intermediates: true });
  } catch {
    // If we can't even create the directory, every key will fall back to silence.
  }

  const result = {} as Record<SfxKey, string>;
  for (const key of SFX_KEYS) {
    try {
      const spec = SOUND_SPECS[key];
      const hash = specHash(spec);
      const path = `${baseDir}${key}-${hash}.wav`;
      const info = await getInfoAsync(path);
      if (!info.exists) {
        const pcm = renderSpec(spec);
        const wav = encodeWav(pcm, SAMPLE_RATE);
        const base64 = uint8ToBase64(wav);
        await writeAsStringAsync(path, base64, { encoding: EncodingType.Base64 });
      }
      result[key] = path;
    } catch {
      result[key] = makeSilentDataUri();
    }
  }
  return result;
}

/** Tiny inline silent WAV (44 bytes header + 0 data) as a data: URI. Used as a fallback. */
function makeSilentDataUri(): string {
  const wav = encodeWav(new Float32Array(0), SAMPLE_RATE);
  return 'data:audio/wav;base64,' + uint8ToBase64(wav);
}

function uint8ToBase64(u8: Uint8Array): string {
  // Chunked to avoid blowing the call stack on large buffers.
  let s = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < u8.length; i += CHUNK) {
    s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + CHUNK)));
  }
  // RN environments expose `global.btoa` via Hermes/JSI. If absent, build manually.
  const g = globalThis as { btoa?: (s: string) => string };
  if (typeof g.btoa === 'function') return g.btoa(s);
  return manualBtoa(s);
}

function manualBtoa(s: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < s.length; i += 3) {
    const a = s.charCodeAt(i);
    const b = i + 1 < s.length ? s.charCodeAt(i + 1) : 0;
    const c = i + 2 < s.length ? s.charCodeAt(i + 2) : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += chars[(triple >> 18) & 63] + chars[(triple >> 12) & 63];
    out += i + 1 < s.length ? chars[(triple >> 6) & 63] : '=';
    out += i + 2 < s.length ? chars[triple & 63] : '=';
  }
  return out;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run tsc`
Expected: clean. If the `expo-file-system/legacy` import fails to resolve, swap to plain `expo-file-system` (per Task 1, Step 3 fallback) and re-run.

- [ ] **Step 3: Commit**

```bash
git add src/audio/bake.ts
git commit -m "feat(audio): bake step writes synthesized WAVs to cache dir"
```

---

### Task 11: Wire `AudioManager.init` to use baked URIs

**Files:**
- Modify: `src/audio/AudioManager.ts`

- [ ] **Step 1: Replace the file contents**

```ts
import { setAudioModeAsync, createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { SFX_KEYS, MUSIC_SOURCES, SFX_POOL_SIZE, type SfxKey, type MusicKey } from '@/audio/catalog';
import { bakeSfx } from '@/audio/bake';
import { makeRng } from '@/audio/synth';

export type Volumes = { master: number; sfx: number; music: number };

const JITTER_KEYS: ReadonlySet<SfxKey> = new Set([
  'tower-fire-firewall',
  'tower-fire-logic-bomb',
  'tower-fire-ice-lance',
  'enemy-hit',
  'enemy-death',
  'ui-click',
]);

export class AudioManager {
  private volumes: Volumes = { master: 1, sfx: 1, music: 0.7 };
  private sfxPools = new Map<SfxKey, { players: AudioPlayer[]; cursor: number }>();
  private musicPlayer: AudioPlayer | null = null;
  private currentMusic: MusicKey | null = null;
  private initialized = false;
  private jitterRng = makeRng(0xa17d10);
  private supportsPlaybackRate = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
    } catch {
      // Audio mode failure is non-fatal — SFX may still work.
    }
    const uris = await bakeSfx();
    for (const key of SFX_KEYS) {
      const players: AudioPlayer[] = [];
      const poolSize = SFX_POOL_SIZE[key];
      for (let i = 0; i < poolSize; i++) {
        try {
          players.push(createAudioPlayer({ uri: uris[key]! }));
        } catch {
          // If a player fails to construct, skip it; round-robin will use what we have.
        }
      }
      this.sfxPools.set(key, { players, cursor: 0 });
    }
    // Duck-type once: assume playbackRate is supported iff the property exists on a
    // freshly-constructed player. Setting an unknown prop on a JS-side proxy doesn't
    // throw, so try/catch on assignment is unreliable — this is.
    const probe = this.sfxPools.get('ui-click')?.players[0];
    this.supportsPlaybackRate = probe !== undefined && 'playbackRate' in (probe as object);
    this.initialized = true;
  }

  setVolumes(v: Partial<Volumes>): void {
    this.volumes = { ...this.volumes, ...v };
    if (this.musicPlayer) this.musicPlayer.volume = this.volumes.master * this.volumes.music;
  }

  playSfx(key: SfxKey): void {
    const pool = this.sfxPools.get(key);
    if (!pool || pool.players.length === 0) return;
    const player = pool.players[pool.cursor]!;
    pool.cursor = (pool.cursor + 1) % pool.players.length;
    try {
      player.volume = this.volumes.master * this.volumes.sfx;
      if (this.supportsPlaybackRate && JITTER_KEYS.has(key)) {
        const rate = 1 + (this.jitterRng() - 0.5) * 0.06;
        (player as unknown as { playbackRate: number }).playbackRate = rate;
      }
      void player.seekTo(0);
      player.play();
    } catch { /* swallow on RN runtime quirks */ }
  }

  async playMusic(key: MusicKey): Promise<void> {
    if (this.currentMusic === key && this.musicPlayer) return;
    if (this.musicPlayer) {
      try { this.musicPlayer.pause(); } catch {}
      try { this.musicPlayer.remove(); } catch {}
      this.musicPlayer = null;
    }
    try {
      this.musicPlayer = createAudioPlayer(MUSIC_SOURCES[key]);
      this.musicPlayer.loop = true;
      this.musicPlayer.volume = this.volumes.master * this.volumes.music;
      this.musicPlayer.play();
      this.currentMusic = key;
    } catch {
      this.musicPlayer = null;
      this.currentMusic = null;
    }
  }

  async stopMusic(): Promise<void> {
    if (!this.musicPlayer) return;
    try { this.musicPlayer.pause(); } catch {}
    try { this.musicPlayer.remove(); } catch {}
    this.musicPlayer = null;
    this.currentMusic = null;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run tsc`
Expected: clean.

- [ ] **Step 3: Run all tests to confirm no regressions**

Run: `npm run test:engine`
Expected: all green.

Run: `npm test`
Expected: all green (the existing `SaveStore.spec.ts` and any RN smoke tests still pass).

- [ ] **Step 4: Commit**

```bash
git add src/audio/AudioManager.ts
git commit -m "feat(audio): play synthesized SFX from baked cache, with optional pitch jitter"
```

---

### Task 12: Manual device verification — first launch

**Files:** none

This task verifies the runtime path that vitest can't cover. **Do not skip — the bake step has only been typechecked, not exercised.**

- [ ] **Step 1: Clear any previously cached sfx (if a build has run before)**

On the simulator/device, uninstall the app to force a clean cache directory.

- [ ] **Step 2: Build and launch on iOS simulator**

Run: `npm run ios`
Expected: app launches without redbox; no thrown errors in the Metro logs.

- [ ] **Step 3: Trigger each SFX in-game**

Walk through:
- Tap a tower in the build palette and place it → expect `tower-placed`.
- Press SEND to start a wave → expect `wave-start`.
- Watch enemies take hits → expect `enemy-hit` and `enemy-death`.
- Let an enemy leak → expect `life-lost`.
- Win or lose the match → expect `win` or `lose`.
- Open and close a modal → expect `ui-click`.

Confirm: each sound is audible, distinct, and not the previous silent placeholder.

- [ ] **Step 4: Confirm cache hit on a cold relaunch**

A cold relaunch (the only way to re-run `AudioProvider.init`) means: kill the app process — swipe up from the iOS app switcher and dismiss, or `adb shell am force-stop <package>` on Android — then reopen. **Backgrounding alone keeps the JS runtime alive and `init` does not re-run, so this won't exercise the cache path.**

Add a `console.log('[bake] writing', path)` next to `writeAsStringAsync` in `bake.ts` for the duration of this check (revert before commit). On a cold relaunch you should see zero `[bake] writing` lines if the cache directory survived. If `cacheDirectory` was evicted by the OS, expect 11 lines on the relaunch — that's correct behavior, just rerun the test.

- [ ] **Step 5: Build and launch on Android**

Run: `npm run android`
Expected: same audible outcome as iOS. Pay special attention to `tower-fire-*` (high event rate) — confirm pitch jitter is applied (sounds vary subtly across repeated shots) or that the `supportsPlaybackRate` flag has flipped to false (sounds are uniform but not broken).

- [ ] **Step 6: If any SFX is silent or distorted, debug**

If one or more keys are silent on a platform:
- Inspect the cache: `${cacheDirectory}sfx/` should contain 11 `.wav` files. Use a Files-app shortcut on iOS or `adb pull` on Android to grab one and verify it plays in a desktop audio app.
- If a file is present but silent on device, the URI form might be the issue: change `createAudioPlayer({ uri: uris[key]! })` to `createAudioPlayer(uris[key]!)` (string form) and re-run.
- If the bake itself is failing, swap the import in `bake.ts` from `expo-file-system/legacy` to `expo-file-system` (top-level) and re-test.

This task is complete when all 11 SFX play audibly on both platforms, on first launch and after relaunch.

- [ ] **Step 7: No commit needed**

Manual verification only. Move to the next task.

---

### Task 13: Document `silent-100ms.wav` is now music-only

**Files:**
- Modify: `src/audio/catalog.ts`

The silent WAV is no longer used by SFX (Task 9 dropped the SFX requires) but `MUSIC_SOURCES` still references it — deleting the file would break Metro bundling for the music keys, and replacing music is explicitly out of scope. This task just clarifies the remaining usage in code.

- [ ] **Step 1: Update the comment in `catalog.ts`**

Replace the leading comment block in `src/audio/catalog.ts` with:

```ts
// SFX keys are synthesized at runtime — see specs.ts and bake.ts.
// Music still uses a placeholder silent WAV; replacing music is out of scope here.
const silent = require('./assets/silent-100ms.wav');
```

- [ ] **Step 2: Commit**

```bash
git add src/audio/catalog.ts
git commit -m "docs(audio): clarify silent.wav is now music-only"
```

---

### Task 14: Final verification & cleanup

**Files:** none

- [ ] **Step 1: Full typecheck**

Run: `npm run tsc`
Expected: clean.

- [ ] **Step 2: Engine TS scope check**

Run: `npm run lint:tsc:engine`
Expected: clean. (`src/audio/` is excluded from this scope, so its files aren't checked here — that's intentional.)

- [ ] **Step 3: Vitest engine suite**

Run: `npm run test:engine`
Expected: all green, including the new `synth`, `wavEncoder`, and `specs` specs.

Run determinism explicitly: `npx vitest run src/engine/__tests__/determinism.spec.ts`
Expected: PASS — confirms audio work didn't leak non-determinism into the simulation.

- [ ] **Step 4: Jest smoke**

Run: `npm test`
Expected: all green.

- [ ] **Step 5: Confirm clean working tree**

Run: `git status`
Expected: clean (or only your own unrelated work-in-progress).

- [ ] **Step 6: No commit needed**

This task is verification only.

---

## Self-Review

### Spec coverage

| Spec section | Implemented in |
|---|---|
| Module layout (4 new files in `src/audio/`) | Tasks 4, 5–7, 8, 10 |
| Synthesis primitives (osc, noise, adsr, lowpass, mix, pad, gain, Rng) | Tasks 5, 6, 7 |
| WAV encoder (16-bit PCM RIFF) | Tasks 3, 4 |
| `SoundSpec` schema + `renderSpec` + 11 specs | Task 8 |
| Determinism (content-hashed RNG seed) | Task 8 (test + impl) |
| Bake step (cache dir, FNV-1a content addressing, fallback-to-silence) | Task 10 |
| `AudioManager.init()` awaits bake; pool uses URIs | Task 11 |
| Per-shot `playbackRate` jitter on a subset of keys | Task 11 (gated by `supportsPlaybackRate`) |
| `catalog.ts` migration (drop `SFX_SOURCES`, add `SFX_KEYS`) | Task 9 |
| `vitest.config.ts` widened to include `src/audio/**/*.spec.ts` | Task 2 |
| Risk #1 — URI vs `require` form | Task 11 (uses `{ uri }`) + Task 12 Step 6 (string-form fallback) |
| Risk #2 — `playbackRate` availability | Task 11 (duck-type `'playbackRate' in player` once at end of `init`) |
| Risk #3 — `expo-file-system` SDK 55 API | Task 1 Step 3 (verifies import) + Task 10 Step 2 (fallback to top-level import) |
| Acceptance: audible SFX on iOS+Android | Task 12 |
| Acceptance: cache hit on relaunch | Task 12 Step 4 |
| Acceptance: tsc + tests green | Task 14 |
| Acceptance: determinism unaffected | Task 14 Step 3 |

### Placeholder scan

No "TBD" / "implement later" / vague handwave steps. Every code step shows the full code. Task 13 is intentionally documentation-only — `silent-100ms.wav` stays on disk for music until music gets a real source in a future plan.

### Type consistency

- `SfxKey` is exported from `catalog.ts` (Task 9) and consumed by `specs.ts` (Task 8), `bake.ts` (Task 10), `AudioManager.ts` (Task 11). All match.
- `Wave`, `NoiseColor`, `Adsr`, `Rng`, `SAMPLE_RATE` are exported from `synth.ts` (Task 5–6) and consumed by `specs.ts` (Task 8). All match.
- `SoundSpec`, `Layer`, `OscLayer`, `NoiseLayer`, `SequenceLayer`, `renderSpec`, `specHash`, `SOUND_SPECS` are exported from `specs.ts` (Task 8) and consumed by `bake.ts` (Task 10). All match.
- `encodeWav` is exported from `wavEncoder.ts` (Task 4) and consumed by `bake.ts` (Task 10). Signature `(pcm: Float32Array, sampleRate: number) => Uint8Array` matches usage.
- `bakeSfx` returns `Promise<Record<SfxKey, string>>` (Task 10) and is awaited in `AudioManager.init` (Task 11). Match.
- `JITTER_KEYS` (Task 11) members are all valid `SfxKey` values per `SFX_KEYS` (Task 9). Verified.

No inconsistencies.
