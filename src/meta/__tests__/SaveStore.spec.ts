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
