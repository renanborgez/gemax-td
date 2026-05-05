import { Skia, type SkPath } from '@shopify/react-native-skia';
import type { TowerKind } from '@/content/types';
import { COLORS } from '@/render/theme';

// All icon paths are designed on a 24×24 viewBox, drawn from the top-left.
// They are baked into a centered, pixel-sized SkPath via `makeTowerIconPath`.
export const TOWER_ICON_VIEWBOX = 24;

// Stroke-only, monoline glyphs that read at small sizes and match the cyberpunk theme.
export const TOWER_ICON_SVG: Record<TowerKind, string> = {
  // Laser tower: trapezoid base, mid-strut, top emitter box, vertical beam,
  // and a tip-flare bar to read as "laser firing upward."
  firewall:
    'M 6 22 L 9 8 L 15 8 L 18 22 Z ' +
    'M 7.5 15 L 16.5 15 ' +
    'M 10 8 L 14 8 L 14 5 L 10 5 Z ' +
    'M 12 5 L 12 0 ' +
    'M 9 1 L 15 1',
  // Bomb: round body with circular highlight, fuse cap on top, curling fuse,
  // and a 4-point spark at the tip. Reads as a classic cartoon bomb.
  'logic-bomb':
    'M 5 15.5 A 7 7 0 1 0 19 15.5 A 7 7 0 1 0 5 15.5 Z ' +
    'M 7.5 12 A 4 4 0 0 1 11 8.5 ' +
    'M 10.5 6.5 L 13.5 6.5 L 13.5 8.5 L 10.5 8.5 Z ' +
    'M 12 6.5 C 13.5 4 15.5 4.5 16.5 2.5 ' +
    'M 16.5 0.5 L 17 1.8 L 18.3 2.5 L 17 3.2 L 16.5 4.5 L 16 3.2 L 14.7 2.5 L 16 1.8 Z',
  // Crystalline diamond/lance with internal facet crosshair.
  'ice-lance':
    'M 12 2 L 18 12 L 12 22 L 6 12 Z ' +
    'M 6 12 L 18 12 ' +
    'M 9 7 L 15 17 ' +
    'M 15 7 L 9 17',
  // Sniper rifle: long barrel pointing up-left, scope ring, stock/grip wedge,
  // and a crosshair reticle to read as "precision shot."
  sniper:
    'M 4 22 L 18 8 ' +
    'M 14 4 L 20 10 ' +
    'M 6 22 L 10 18 L 12 20 L 8 24 Z ' +
    'M 14 9 A 3 3 0 1 0 14 15 A 3 3 0 1 0 14 9 Z ' +
    'M 11 12 L 17 12 ' +
    'M 14 9 L 14 15',
  // Tesla coil: stacked toroid base, central rod, top sphere, and forking
  // lightning bolts radiating outward.
  'tesla-coil':
    'M 6 22 L 18 22 ' +
    'M 8 20 L 16 20 ' +
    'M 9 18 L 15 18 ' +
    'M 12 18 L 12 8 ' +
    'M 9 8 A 3 3 0 1 0 15 8 A 3 3 0 1 0 9 8 Z ' +
    'M 12 5 L 10 1 L 13 3 L 11 -1 ' +
    'M 18 4 L 21 1 ' +
    'M 6 4 L 3 1',
  // Venom spire: dripping fang silhouette with an inner highlight and a falling
  // poison droplet beneath. Reads as toxin even at small sizes.
  'venom-spire':
    'M 7 2 L 17 2 L 14 14 L 12 18 L 10 14 Z ' +
    'M 10 5 L 12 13 L 14 5 ' +
    'M 12 20 C 10 21 10 23 12 23 C 14 23 14 21 12 20 Z',
};

export const TOWER_ICON_COLORS: Record<TowerKind, string> = {
  firewall: COLORS.primary,
  'logic-bomb': COLORS.danger,
  'ice-lance': COLORS.secondary,
  sniper: COLORS.tertiary,
  'tesla-coil': COLORS.primary,
  'venom-spire': COLORS.acid,
};

/**
 * Bake an icon's SVG path data into a Skia path that is scaled to `sizePx` and
 * centered at the origin. Pre-baking lets callers translate the whole icon via
 * a single Group transform without per-frame path math.
 *
 * Cached by (kind, sizePx). Each call to `Skia.Path.MakeFromSVGString` parses
 * + rasterizes natively and is expensive; without the cache, tap-driven UI
 * (e.g. selecting a kind to place) re-baked the same paths each render.
 */
const ICON_PATH_CACHE = new Map<string, SkPath>();

export function makeTowerIconPath(kind: TowerKind, sizePx: number): SkPath {
  const cacheKey = `${kind}:${sizePx}`;
  const cached = ICON_PATH_CACHE.get(cacheKey);
  if (cached) return cached;
  const path = Skia.Path.MakeFromSVGString(TOWER_ICON_SVG[kind]);
  if (!path) throw new Error(`Invalid SVG path for tower icon: ${kind}`);
  // Two sequential transforms: first move the 24×24 box's center to the
  // origin, then scale to target pixel size. Splitting into two `transform`
  // calls avoids any ambiguity about matrix pre/post concatenation order.
  const center = Skia.Matrix();
  center.translate(-TOWER_ICON_VIEWBOX / 2, -TOWER_ICON_VIEWBOX / 2);
  path.transform(center);
  const scale = Skia.Matrix();
  const s = sizePx / TOWER_ICON_VIEWBOX;
  scale.scale(s, s);
  path.transform(scale);
  ICON_PATH_CACHE.set(cacheKey, path);
  return path;
}

export const TOWER_ICON_KINDS: readonly TowerKind[] = [
  'firewall', 'logic-bomb', 'ice-lance', 'sniper', 'tesla-coil', 'venom-spire',
];
