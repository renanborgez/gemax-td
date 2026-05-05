import { Skia, type SkPath } from '@shopify/react-native-skia';
import type { EnemyKind } from '@/content/types';
import { COLORS } from '@/render/theme';

// Mirrors towerIcons.ts: stroke-only monoline glyphs on a 24×24 viewBox,
// baked into a centered SkPath so a Group transform can place them per-frame.
export const ENEMY_ICON_VIEWBOX = 24;

export const ENEMY_ICON_SVG: Record<EnemyKind, string> = {
  // Worm: three-hump undulating body, round head with eye, forked tail.
  // Reads instantly as a serpent/worm crawler.
  worm:
    'M 3 14 C 5 14 5 10 7 10 C 9 10 9 14 11 14 ' +
    'C 13 14 13 10 15 10 C 17 10 17 14 18 14 ' +
    'M 18 14 A 2 2 0 1 0 22 14 A 2 2 0 1 0 18 14 ' +
    'M 20.5 13.2 L 20.5 13.21 ' +
    'M 3 14 L 1.5 13 ' +
    'M 3 14 L 1.5 15',
  // Trojan: gift-box silhouette with antennae poking out — the "trick inside"
  // motif. Square box, lid line, ribbon, and two pulled-out antenna whiskers.
  trojan:
    'M 5 10 L 19 10 L 19 20 L 5 20 Z ' +
    'M 5 13 L 19 13 ' +
    'M 12 10 L 12 20 ' +
    'M 8 10 L 6 5 ' +
    'M 16 10 L 18 5 ' +
    'M 6 4 L 6 4.01 ' +
    'M 18 4 L 18 4.01',
  // Daemon: classic horned demon face — pointed horns, oval head, X-pierce
  // eyes, jagged grin.
  daemon:
    'M 7 11 L 4 4 L 9 9 ' +
    'M 17 11 L 20 4 L 15 9 ' +
    'M 7 11 C 7 9 9 8 12 8 C 15 8 17 9 17 11 L 17 14 C 17 18 15 20 12 20 C 9 20 7 18 7 14 Z ' +
    'M 9 12 L 11 14 M 11 12 L 9 14 ' +
    'M 13 12 L 15 14 M 15 12 L 13 14 ' +
    'M 9 17 L 11 18.5 L 12 17 L 13 18.5 L 15 17',
  // Rootkit (boss): skull with X-eyes, jaw teeth, and root tendrils descending
  // — the "deep, dug-in" malware motif.
  rootkit:
    'M 5 12 C 5 7 8 4 12 4 C 16 4 19 7 19 12 L 19 16 L 16 16 L 16 19 L 13 19 L 13 16 L 11 16 L 11 19 L 8 19 L 8 16 L 5 16 Z ' +
    'M 8 10 L 10 12 M 10 10 L 8 12 ' +
    'M 14 10 L 16 12 M 16 10 L 14 12 ' +
    'M 8 21 L 6 23 ' +
    'M 12 21 L 12 23 ' +
    'M 16 21 L 18 23',
};

export const ENEMY_ICON_COLORS: Record<EnemyKind, string> = {
  worm: COLORS.secondary,
  trojan: COLORS.tertiary,
  daemon: COLORS.danger,
  rootkit: COLORS.magenta,
};

/**
 * Bake the SVG into a Skia path scaled to `sizePx` and centered at the origin.
 * Same two-step matrix trick as `makeTowerIconPath` — translate the 24×24 box
 * to origin, then scale.
 */
export function makeEnemyIconPath(kind: EnemyKind, sizePx: number): SkPath {
  const path = Skia.Path.MakeFromSVGString(ENEMY_ICON_SVG[kind]);
  if (!path) throw new Error(`Invalid SVG path for enemy icon: ${kind}`);
  const center = Skia.Matrix();
  center.translate(-ENEMY_ICON_VIEWBOX / 2, -ENEMY_ICON_VIEWBOX / 2);
  path.transform(center);
  const scale = Skia.Matrix();
  const s = sizePx / ENEMY_ICON_VIEWBOX;
  scale.scale(s, s);
  path.transform(scale);
  return path;
}

export const ENEMY_ICON_KINDS: readonly EnemyKind[] = ['worm', 'trojan', 'daemon', 'rootkit'];
