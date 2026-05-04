export type Brand<T, B extends string> = T & { readonly __brand: B };

export type DeepReadonly<T> =
  T extends (infer U)[] ? readonly DeepReadonly<U>[] :
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
  T;

export type GridCoord = { col: number; row: number };
