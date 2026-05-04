export abstract class Entity {
  readonly id: string;
  readonly kind: string;
  x: number;
  y: number;
  alive: boolean = true;

  constructor(opts: { id: string; kind: string; x: number; y: number }) {
    this.id = opts.id;
    this.kind = opts.kind;
    this.x = opts.x;
    this.y = opts.y;
  }
}
