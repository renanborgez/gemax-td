export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const clamp = (x: number, min: number, max: number): number =>
  x < min ? min : x > max ? max : x;

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
