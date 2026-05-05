export type SimEventMap = {
  'enemy-died': { enemyId: string; bounty: number; killedByTowerId: string };
  'enemy-leaked': { enemyKind: string };
  'life-lost': { enemyKind: string };
  'wave-started': { waveIndex: number };
  'wave-cleared': { waveIndex: number };
  'tower-placed': { towerId: string; kind: string };
  'tower-fired': { towerId: string; kind: string };
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
