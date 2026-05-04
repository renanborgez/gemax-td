// Mulberry32 — small, fast, deterministic.
export class SeededRng {
  private state: number;

  constructor(seed: number) {
    // Force unsigned 32-bit
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(n: number): number {
    return Math.floor(this.next() * n);
  }

  rangeFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick from empty array');
    return arr[this.range(arr.length)] as T;
  }

  /** Snapshot for save/replay. */
  serialize(): number {
    return this.state;
  }

  static fromSerialized(state: number): SeededRng {
    const r = new SeededRng(0);
    r.state = state >>> 0;
    return r;
  }
}
