import { type SaveDataLatest, blankSaveDataLatest, CURRENT_VERSION, type PersistedBlobLatest } from '@/meta/schema';
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
    if (main) { this.cache = runMigrations(main); this.normalizeOnLoad(); return this.cache; }
    // Recover from tmp if main is missing/corrupt.
    const tmp = await this.tryParse(await this.kv.getItem(KEY_TMP));
    if (tmp) {
      this.cache = runMigrations(tmp);
      this.normalizeOnLoad();
      await this.flush();         // rewrite main from tmp
      return this.cache;
    }
    this.cache = blankSaveDataLatest();
    await this.flush();           // persist initial save
    return this.cache;
  }

  /** Reset session-only flags that shouldn't survive an app restart, even in
   *  dev. Right now that's just the dev god-mode toggle: it persists during a
   *  session so the player can take advantage of the boost across screens, but
   *  every fresh launch should start with it off so dev defaults match
   *  production behavior unless the dev explicitly opts back in. */
  private normalizeOnLoad(): void {
    if (!this.cache) return;
    // `__DEV__` is a React Native runtime global; the engine tsconfig doesn't
    // ship its type, and vitest's Node env doesn't define it at all. Read it
    // through globalThis so SaveStore stays usable from pure-TS unit tests
    // (treated as production = no-op normalize) without a type declaration.
    const isDev = (globalThis as { __DEV__?: boolean }).__DEV__ === true;
    if (isDev && this.cache.settings.devGodMode === true) {
      delete this.cache.settings.devGodMode;
    }
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
    const blob: PersistedBlobLatest = { version: CURRENT_VERSION, data: this.cache };
    const json = JSON.stringify(blob);
    await this.kv.setItem(KEY_TMP, json);
    await this.kv.setItem(KEY_MAIN, json);
    await this.kv.removeItem(KEY_TMP);
  }

  async reset(): Promise<void> {
    this.cache = blankSaveDataLatest();
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
