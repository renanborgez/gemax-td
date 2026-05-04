import { Skia, type SkPath } from '@shopify/react-native-skia';
import type { TowerKind } from '@/content/types';
import { COLORS } from '@/render/theme';

// All icon paths are designed on a 24×24 viewBox, drawn from the top-left.
// They are baked into a centered, pixel-sized SkPath via `makeTowerIconPath`.
export const TOWER_ICON_VIEWBOX = 24;

// Stroke-only, monoline glyphs that read at small sizes and match the cyberpunk theme.
export const TOWER_ICON_SVG: Record<TowerKind, string> = {
  // Brick wall: outer rect + horizontal mortar courses + staggered vertical mortar.
  firewall:
    'M 3 6 L 21 6 L 21 19 L 3 19 Z ' +
    'M 3 10.3 L 21 10.3 ' +
    'M 3 14.6 L 21 14.6 ' +
    'M 9 6 L 9 10.3 ' +
    'M 15 6 L 15 10.3 ' +
    'M 12 10.3 L 12 14.6 ' +
    'M 9 14.6 L 9 19 ' +
    'M 15 14.6 L 15 19',
  // Round bomb body + zigzag fuse with a spark wisp.
  'logic-bomb':
    'M 18 14.5 A 6 6 0 1 1 6 14.5 A 6 6 0 1 1 18 14.5 Z ' +
    'M 12 8.5 L 12 5 ' +
    'M 12 5 L 14 3 L 12 1 ' +
    'M 14 3 L 17 2',
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
