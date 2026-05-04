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
};

export const TOWER_ICON_COLORS: Record<TowerKind, string> = {
  firewall: COLORS.primary,
  'logic-bomb': COLORS.danger,
  'ice-lance': COLORS.secondary,
};

/**
 * Bake an icon's SVG path data into a Skia path that is scaled to `sizePx` and
 * centered at the origin. Pre-baking lets callers translate the whole icon via
 * a single Group transform without per-frame path math.
 */
export function makeTowerIconPath(kind: TowerKind, sizePx: number): SkPath {
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
  return path;
}

export const TOWER_ICON_KINDS: readonly TowerKind[] = ['firewall', 'logic-bomb', 'ice-lance'];
