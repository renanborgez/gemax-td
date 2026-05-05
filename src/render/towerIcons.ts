import { Skia, type SkPath } from '@shopify/react-native-skia';
import type { TowerKind } from '@/content/types';
import { COLORS } from '@/render/theme';

// All icon paths are designed on a 24×24 viewBox, drawn from the top-left.
// They are baked into a centered, pixel-sized SkPath via `makeTowerIconPath`.
export const TOWER_ICON_VIEWBOX = 24;

// Stroke-only, monoline glyphs that read at small sizes and match the cyberpunk theme.
export const TOWER_ICON_SVG: Record<TowerKind, string> = {
  // Bullet Turret: square base + barrel + muzzle flash flare.
  'bullet-turret':
    'M 4 22 L 14 22 L 14 18 L 4 18 Z ' +
    'M 6 18 L 6 14 ' +
    'M 12 18 L 12 14 ' +
    'M 5 14 L 13 14 ' +
    'M 9 14 L 9 7 ' +
    'M 7.5 8 L 10.5 8 ' +
    'M 9 7 L 9 5 ' +
    'M 9 5 L 7.5 6 M 9 5 L 10.5 6',
  // Machine Gun: stout twin-barrels + ammo belt curving in.
  'machine-gun':
    'M 4 22 L 14 22 L 14 18 L 4 18 Z ' +
    'M 6 18 L 6 14 M 12 18 L 12 14 ' +
    'M 5 14 L 13 14 ' +
    'M 7 14 L 7 6 ' +
    'M 11 14 L 11 6 ' +
    'M 6 6 L 12 6 ' +
    'M 14 18 C 18 18 20 16 20 14 ' +
    'M 16 18 L 17 17 M 18 17 L 19 16',
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
  // EMP: stout antenna base, central node, and three concentric arcs radiating
  // outward — the canonical "broadcast pulse" symbol.
  emp:
    'M 8 22 L 16 22 ' +
    'M 12 22 L 12 14 ' +
    'M 10 14 A 2 2 0 1 0 14 14 A 2 2 0 1 0 10 14 Z ' +
    'M 7 11 A 6 6 0 0 1 17 11 ' +
    'M 5 9 A 9 9 0 0 1 19 9 ' +
    'M 3 7 A 12 12 0 0 1 21 7',
  // Plasma Cannon: heavy barrel + glowing core + side stabilizers.
  'plasma-cannon':
    'M 4 22 L 8 22 L 8 18 L 4 18 Z ' +
    'M 8 20 L 22 20 ' +
    'M 8 18 L 22 18 ' +
    'M 22 17 L 24 17 L 24 21 L 22 21 ' +
    'M 9 14 A 3 3 0 1 0 15 14 A 3 3 0 1 0 9 14 ' +
    'M 12 11 L 12 13 ' +
    'M 12 17 L 12 14 ' +
    'M 5 19 L 5 22',
  // Mortar: stout tube angled up with shell, base plate.
  mortar:
    'M 4 22 L 14 22 L 14 18 L 4 18 Z ' +
    'M 5 18 L 11 8 ' +
    'M 9 18 L 15 8 ' +
    'M 11 6 A 1.6 1.6 0 1 0 14 6 A 1.6 1.6 0 1 0 11 6 ' +
    'M 12 4 L 12 1 ' +
    'M 16 22 L 20 22 ' +
    'M 18 22 L 18 18',
  // Cryo Field: snowflake — six-arm radial with branched tips.
  'cryo-field':
    'M 12 3 L 12 21 ' +
    'M 4 7.5 L 20 16.5 ' +
    'M 4 16.5 L 20 7.5 ' +
    'M 12 6 L 10 4 M 12 6 L 14 4 ' +
    'M 12 18 L 10 20 M 12 18 L 14 20 ' +
    'M 6 9.5 L 4 9 M 6 9.5 L 5 11 ' +
    'M 18 14.5 L 20 15 M 18 14.5 L 19 13 ' +
    'M 6 14.5 L 4 15 M 6 14.5 L 5 13 ' +
    'M 18 9.5 L 20 9 M 18 9.5 L 19 11',
  // Marker: crosshair reticle.
  marker:
    'M 12 5 A 7 7 0 1 0 12 19 A 7 7 0 1 0 12 5 ' +
    'M 12 2 L 12 7 ' +
    'M 12 17 L 12 22 ' +
    'M 2 12 L 7 12 ' +
    'M 17 12 L 22 12 ' +
    'M 12 11 L 12 13 ' +
    'M 11 12 L 13 12',
  // Beam Cannon: long sustained-beam emitter with focusing rings.
  'beam-cannon':
    'M 4 12 L 22 12 ' +
    'M 6 9.5 L 6 14.5 ' +
    'M 9 8 L 9 16 ' +
    'M 12 6.5 L 12 17.5 ' +
    'M 22 12 L 24 12 ' +
    'M 4 22 L 8 22 L 8 18 L 4 18 Z ' +
    'M 6 18 L 6 14',
  // Flamer: nozzle with flame tongue (stacked Vs).
  flamer:
    'M 4 22 L 8 22 L 8 18 L 4 18 Z ' +
    'M 8 20 L 14 20 L 14 18 L 8 18 ' +
    'M 14 19 C 17 19 20 17 22 14 ' +
    'M 14 19 C 17 19 20 21 22 23 ' +
    'M 16 14 L 18 16 L 16 17 ' +
    'M 18 16 L 21 14 ' +
    'M 16 22 L 19 21 L 17 19',
};

export const TOWER_ICON_COLORS: Record<TowerKind, string> = {
  'bullet-turret': COLORS.tertiary,
  'machine-gun': COLORS.danger,
  firewall: COLORS.primary,
  'logic-bomb': COLORS.danger,
  'ice-lance': COLORS.secondary,
  sniper: COLORS.tertiary,
  'tesla-coil': COLORS.primary,
  'venom-spire': COLORS.acid,
  emp: COLORS.cyan,
  'plasma-cannon': COLORS.magenta,
  mortar: COLORS.amber,
  'cryo-field': COLORS.secondary,
  marker: COLORS.tertiary,
  'beam-cannon': COLORS.primary,
  flamer: COLORS.danger,
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
  // Center on the glyph's *actual* bounding box, not on the nominal 24×24
  // viewBox. Several glyphs (e.g. bullet-turret) don't center their visual
  // centroid at (12, 12), and a fixed-translate would render them offset
  // from the tile midpoint. `computeTightBounds()` walks curves precisely.
  const bounds = path.computeTightBounds();
  const cxRaw = bounds.x + bounds.width / 2;
  const cyRaw = bounds.y + bounds.height / 2;
  const center = Skia.Matrix();
  center.translate(-cxRaw, -cyRaw);
  path.transform(center);
  // Scale uniformly so the glyph fits inside `sizePx`. Use the larger of
  // width/height so non-square glyphs don't overflow the tile circle.
  const span = Math.max(bounds.width, bounds.height) || TOWER_ICON_VIEWBOX;
  const scale = Skia.Matrix();
  const s = sizePx / span;
  scale.scale(s, s);
  path.transform(scale);
  ICON_PATH_CACHE.set(cacheKey, path);
  return path;
}

export const TOWER_ICON_KINDS: readonly TowerKind[] = [
  'bullet-turret', 'machine-gun',
  'firewall', 'logic-bomb', 'ice-lance', 'sniper', 'tesla-coil', 'venom-spire', 'emp',
  'plasma-cannon', 'mortar', 'cryo-field', 'marker', 'beam-cannon', 'flamer',
];
