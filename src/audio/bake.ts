import {
  cacheDirectory, getInfoAsync, makeDirectoryAsync, writeAsStringAsync, EncodingType,
} from 'expo-file-system/legacy';
import { SFX_KEYS, MUSIC_KEYS, type SfxKey, type MusicKey } from '@/audio/catalog';
import { SOUND_SPECS, MUSIC_SPECS, renderSpec, specHash, type SoundSpec } from '@/audio/specs';
import { encodeWav } from '@/audio/wavEncoder';
import { SAMPLE_RATE } from '@/audio/synth';

async function bakeSpecMap<K extends string>(
  subdir: string,
  specs: Readonly<Record<K, SoundSpec>>,
  keys: readonly K[],
): Promise<Record<K, string>> {
  const baseDir = (cacheDirectory ?? '') + subdir + '/';
  try {
    const info = await getInfoAsync(baseDir);
    if (!info.exists) await makeDirectoryAsync(baseDir, { intermediates: true });
  } catch {
    // If we can't even create the directory, every key will fall back to silence.
  }

  const result = {} as Record<K, string>;
  for (const key of keys) {
    try {
      const spec = specs[key];
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

/** Bake all SFX to `${cacheDirectory}sfx/<key>-<hash>.wav`. */
export async function bakeSfx(): Promise<Record<SfxKey, string>> {
  return bakeSpecMap('sfx', SOUND_SPECS, SFX_KEYS);
}

/** Bake all music loops to `${cacheDirectory}music/<key>-<hash>.wav`. */
export async function bakeMusic(): Promise<Record<MusicKey, string>> {
  return bakeSpecMap('music', MUSIC_SPECS, MUSIC_KEYS);
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
    out += chars[(triple >> 18) & 63]! + chars[(triple >> 12) & 63]!;
    out += i + 1 < s.length ? chars[(triple >> 6) & 63]! : '=';
    out += i + 2 < s.length ? chars[triple & 63]! : '=';
  }
  return out;
}
