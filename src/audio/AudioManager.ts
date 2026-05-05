import { setAudioModeAsync, createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { SFX_KEYS, SFX_POOL_SIZE, type SfxKey, type MusicKey } from '@/audio/catalog';
import { bakeSfx, bakeMusic } from '@/audio/bake';
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
  private musicUris: Record<MusicKey, string> | null = null;
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
    const [sfxUris, musicUris] = await Promise.all([bakeSfx(), bakeMusic()]);
    this.musicUris = musicUris;
    const uris = sfxUris;
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
    const uri = this.musicUris?.[key];
    if (!uri) return;
    try {
      this.musicPlayer = createAudioPlayer({ uri });
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
