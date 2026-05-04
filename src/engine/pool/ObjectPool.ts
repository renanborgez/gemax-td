export type ObjectPoolOptions<T> = {
  create: () => T;
  reset: (obj: T) => void;
  initialSize: number;
};

export class ObjectPool<T> {
  private free: T[] = [];
  private active = new Set<T>();
  private create: () => T;
  private reset: (obj: T) => void;

  constructor(opts: ObjectPoolOptions<T>) {
    this.create = opts.create;
    this.reset = opts.reset;
    for (let i = 0; i < opts.initialSize; i++) this.free.push(this.create());
  }

  acquire(): T {
    const obj = this.free.pop() ?? this.create();
    this.active.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (!this.active.delete(obj)) return;
    this.reset(obj);
    this.free.push(obj);
  }

  get freeCount(): number { return this.free.length; }
  get activeCount(): number { return this.active.size; }
}
