import { setAudioModeAsync, createAudioPlayer, type AudioPlayer } from 'expo-audio';
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
    try {
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
    } catch {
      // Audio mode failure is non-fatal — SFX may still work.
    }
    for (const key of Object.keys(SFX_SOURCES) as SfxKey[]) {
      const players: AudioPlayer[] = [];
      const poolSize = SFX_POOL_SIZE[key];
      for (let i = 0; i < poolSize; i++) {
        try {
          players.push(createAudioPlayer(SFX_SOURCES[key]));
        } catch {
          // If a player fails to construct, skip it; round-robin will use what we have.
        }
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
    if (!pool || pool.players.length === 0) return;
    const player = pool.players[pool.cursor]!;
    pool.cursor = (pool.cursor + 1) % pool.players.length;
    try {
      player.volume = this.volumes.master * this.volumes.sfx;
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
