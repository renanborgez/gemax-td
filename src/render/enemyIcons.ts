import { Skia, type SkPath } from '@shopify/react-native-skia';
import type { EnemyKind } from '@/content/types';
import { COLORS } from '@/render/theme';

// Mirrors towerIcons.ts: stroke-only monoline glyphs on a 24×24 viewBox,
// baked into a centered SkPath so a Group transform can place them per-frame.
export const ENEMY_ICON_VIEWBOX = 24;

export const ENEMY_ICON_SVG: Record<EnemyKind, string> = {
  // Mote: tiny dot inside dotted ring — minimal swarm filler.
  mote:
    'M 10.5 12 A 1.5 1.5 0 1 0 13.5 12 A 1.5 1.5 0 1 0 10.5 12 ' +
    'M 12 6 L 12 6.01 M 16 8 L 16 8.01 M 18 12 L 18 12.01 M 16 16 L 16 16.01 ' +
    'M 12 18 L 12 18.01 M 8 16 L 8 16.01 M 6 12 L 6 12.01 M 8 8 L 8 8.01',
  // Sprite: small four-point star with halo lines — flying runner.
  sprite:
    'M 12 5 L 13 11 L 19 12 L 13 13 L 12 19 L 11 13 L 5 12 L 11 11 Z ' +
    'M 3 7 L 5 8 M 21 7 L 19 8 M 3 17 L 5 16 M 21 17 L 19 16',
  // Worm: three-hump undulating body, round head with eye, forked tail.
  // Reads instantly as a serpent/worm crawler.
  worm:
    'M 3 14 C 5 14 5 10 7 10 C 9 10 9 14 11 14 ' +
    'C 13 14 13 10 15 10 C 17 10 17 14 18 14 ' +
    'M 18 14 A 2 2 0 1 0 22 14 A 2 2 0 1 0 18 14 ' +
    'M 20.5 13.2 L 20.5 13.21 ' +
    'M 3 14 L 1.5 13 ' +
    'M 3 14 L 1.5 15',
  // Packet: rightward dart arrow with motion lines — the runner glyph.
  packet:
    'M 4 12 L 16 6 L 16 10 L 22 12 L 16 14 L 16 18 Z ' +
    'M 2 9 L 6 9 M 2 12 L 5 12 M 2 15 L 6 15',
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
  // Drone: hovering quad-rotor — flying mid-tier.
  drone:
    'M 12 9 A 2 2 0 1 0 12 13 A 2 2 0 1 0 12 9 ' +
    'M 12 11 L 6 6 M 12 11 L 18 6 M 12 11 L 6 16 M 12 11 L 18 16 ' +
    'M 4 6 A 2 1.2 0 1 0 8 6 A 2 1.2 0 1 0 4 6 ' +
    'M 16 6 A 2 1.2 0 1 0 20 6 A 2 1.2 0 1 0 16 6 ' +
    'M 4 16 A 2 1.2 0 1 0 8 16 A 2 1.2 0 1 0 4 16 ' +
    'M 16 16 A 2 1.2 0 1 0 20 16 A 2 1.2 0 1 0 16 16',
  // Crawler: insectoid arc body with six legs.
  crawler:
    'M 5 12 C 5 8 8 6 12 6 C 16 6 19 8 19 12 ' +
    'M 5 12 L 5 14 M 19 12 L 19 14 ' +
    'M 7 12 L 5 16 M 12 12 L 12 17 M 17 12 L 19 16 ' +
    'M 9 12 L 7 17 M 15 12 L 17 17 ' +
    'M 9 9 L 9 9.01 M 15 9 L 15 9.01',
  // Stalker: predator triangle with twin sensor eyes — fast mid creep.
  stalker:
    'M 4 18 L 12 4 L 20 18 Z ' +
    'M 9 14 A 1 1 0 1 0 9 14.01 ' +
    'M 15 14 A 1 1 0 1 0 15 14.01 ' +
    'M 8 18 L 6 22 M 16 18 L 18 22',
  // Phantom: hooded silhouette with single eye-slit — phaser-themed mid.
  phantom:
    'M 12 4 C 8 4 5 7 5 12 L 5 18 ' +
    'C 6 17 7 19 8 18 C 9 17 10 19 11 18 C 12 17 13 19 14 18 ' +
    'C 15 17 16 19 17 18 C 18 17 19 19 19 18 L 19 12 C 19 7 16 4 12 4 Z ' +
    'M 9 11 L 15 11',
  // Bastion: heater shield with armor band and rivet — the armored creep.
  bastion:
    'M 12 3 L 19 6 L 19 13 C 19 17 16 20 12 21 C 8 20 5 17 5 13 L 5 6 Z ' +
    'M 5 10 L 19 10 ' +
    'M 9 14 L 15 14 ' +
    'M 12 6 L 12 9',
  // Forkbomb: branching tree — splits into children on death.
  forkbomb:
    'M 12 4 L 12 10 ' +
    'M 12 10 L 7 16 ' +
    'M 12 10 L 17 16 ' +
    'M 7 16 L 4 21 ' +
    'M 7 16 L 10 21 ' +
    'M 17 16 L 14 21 ' +
    'M 17 16 L 20 21 ' +
    'M 12 4 L 9 1 ' +
    'M 12 4 L 15 1',
  // Cache: concentric rings with a plus — heal-aura support unit.
  cache:
    'M 12 4 A 8 8 0 1 0 12 20 A 8 8 0 1 0 12 4 ' +
    'M 12 7 A 5 5 0 1 0 12 17 A 5 5 0 1 0 12 7 ' +
    'M 12 9 L 12 15 ' +
    'M 9 12 L 15 12',
  // Reaper: hooded scythe silhouette — fast heavy.
  reaper:
    'M 12 4 C 8 4 6 7 6 11 C 6 15 8 18 12 18 C 16 18 18 15 18 11 C 18 7 16 4 12 4 Z ' +
    'M 9 10 L 11 10 M 13 10 L 15 10 ' +
    'M 4 8 C 8 4 10 4 14 8 ' +
    'M 4 8 L 2 14 ' +
    'M 12 18 L 14 22',
  // Knight: greathelm with visor slit and crest — armored heavy.
  knight:
    'M 6 8 C 6 5 9 4 12 4 C 15 4 18 5 18 8 L 18 16 ' +
    'C 18 18 16 19 12 19 C 8 19 6 18 6 16 Z ' +
    'M 8 10 L 16 10 M 8 12 L 16 12 M 8 14 L 16 14 ' +
    'M 12 4 L 12 1 M 12 1 L 14 0 M 12 1 L 10 0',
  // Sentinel: eye-shaped flyer with twin wings — heavy flier.
  sentinel:
    'M 12 9 A 4 3 0 1 0 12 15 A 4 3 0 1 0 12 9 ' +
    'M 12 11 A 1 1 0 1 0 12 13 A 1 1 0 1 0 12 11 ' +
    'M 8 12 C 5 9 3 9 1 11 ' +
    'M 16 12 C 19 9 21 9 23 11 ' +
    'M 8 13 C 5 15 3 15 1 13 ' +
    'M 16 13 C 19 15 21 15 23 13',
  // Construct: blocky golem with pauldrons and core glyph — heavy splitter.
  construct:
    'M 5 8 L 9 4 L 15 4 L 19 8 L 19 18 L 15 22 L 9 22 L 5 18 Z ' +
    'M 5 12 L 19 12 ' +
    'M 12 7 L 12 11 ' +
    'M 10 15 L 14 15 M 10 17 L 14 17 M 10 19 L 14 19',
  // Bulwark: crenellated keep — slow armored tank.
  bulwark:
    'M 4 20 L 4 8 L 7 8 L 7 5 L 10 5 L 10 8 L 14 8 L 14 5 L 17 5 L 17 8 L 20 8 L 20 20 Z ' +
    'M 8 20 L 8 14 L 16 14 L 16 20 ' +
    'M 10 11 L 14 11',
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
  // Wraith (boss): hooded phantom — round shroud top, hollow eye sockets,
  // wavering vapor tail. The "phases out" netrunner ghost motif.
  wraith:
    'M 12 3 C 7 3 4 7 4 12 L 4 18 ' +
    'C 5 17 6 19 7 18 C 8 17 9 19 10 18 C 11 17 12 19 13 18 ' +
    'C 14 17 15 19 16 18 C 17 17 18 19 19 18 C 19 19 20 17 20 18 L 20 12 ' +
    'C 20 7 17 3 12 3 Z ' +
    'M 9 10 A 1.2 1.6 0 1 0 9 10.01 ' +
    'M 15 10 A 1.2 1.6 0 1 0 15 10.01 ' +
    'M 9 14 C 10.5 15.5 13.5 15.5 15 14',
  // Hypervisor (boss): server-rack body with three blade tiers, side struts,
  // and four cooling-vent slots. Reads as "infrastructure boss."
  hypervisor:
    'M 5 4 L 19 4 L 19 20 L 5 20 Z ' +
    'M 5 9 L 19 9 ' +
    'M 5 14 L 19 14 ' +
    'M 7 6.5 L 9 6.5 M 11 6.5 L 13 6.5 M 15 6.5 L 17 6.5 ' +
    'M 7 11.5 L 9 11.5 M 11 11.5 L 13 11.5 M 15 11.5 L 17 11.5 ' +
    'M 7 16.5 L 9 16.5 M 11 16.5 L 13 16.5 M 15 16.5 L 17 16.5 ' +
    'M 5 20 L 4 23 M 19 20 L 20 23',
  // Kernelghost (boss): hooded skull glyph wrapped by a dotted code-stream
  // halo. Kernel-level intrusion + ghost tail = endgame boss read.
  kernelghost:
    'M 6 14 C 6 8 9 5 12 5 C 15 5 18 8 18 14 L 18 18 ' +
    'L 16 18 L 16 20 L 14 20 L 14 18 L 10 18 L 10 20 L 8 20 L 8 18 L 6 18 Z ' +
    'M 9.5 11 L 11 12.5 M 11 11 L 9.5 12.5 ' +
    'M 13 11 L 14.5 12.5 M 14.5 11 L 13 12.5 ' +
    'M 11 15 L 13 15 ' +
    'M 4 8 L 4 8.01 M 3 12 L 3 12.01 M 4 16 L 4 16.01 ' +
    'M 20 8 L 20 8.01 M 21 12 L 21 12.01 M 20 16 L 20 16.01 ' +
    'M 8 22 L 6 23 M 12 22 L 12 23 M 16 22 L 18 23',
  // Firmware Leech — barbed parasite. Segmented body curving downward with
  // hooked head and dripping syphons.
  'firmware-leech':
    'M 4 6 C 8 6 8 12 12 12 C 16 12 16 18 20 18 ' +
    'M 4 4 L 4 8 ' +
    'M 6 5 L 7 7 ' +
    'M 18 16 L 18 20 ' +
    'M 12 11 L 12 14 ' +
    'M 8 9 L 8 11',
  // Darknet Titan — colossal helm with mandibles. Heavy armored skull glyph.
  'darknet-titan':
    'M 4 8 L 8 4 L 16 4 L 20 8 L 20 14 L 18 16 L 16 20 L 8 20 L 6 16 L 4 14 Z ' +
    'M 8 10 L 10 12 M 10 10 L 8 12 ' +
    'M 14 10 L 16 12 M 16 10 L 14 12 ' +
    'M 9 17 L 11 18 L 12 17 L 13 18 L 15 17 ' +
    'M 6 8 L 4 5 M 18 8 L 20 5',
  // Quantum Shade — phasing diamond with dual outline (interference pattern).
  'quantum-shade':
    'M 12 3 L 19 12 L 12 21 L 5 12 Z ' +
    'M 12 6 L 16 12 L 12 18 L 8 12 Z ' +
    'M 5 12 L 19 12 ' +
    'M 12 3 L 12 21',
  // Logic Gate — NAND-shaped silhouette with inputs and inverted output bubble.
  'logic-gate':
    'M 5 6 L 12 6 C 17 6 19 9 19 12 C 19 15 17 18 12 18 L 5 18 Z ' +
    'M 5 9 L 7 9 M 5 15 L 7 15 ' +
    'M 19 12 L 21 12 ' +
    'M 22 12 A 1 1 0 1 0 22 12.01',
  // Voidwalker — tall featureless silhouette with twin glowing voids and a tail.
  voidwalker:
    'M 9 4 L 15 4 L 16 8 L 16 18 L 14 22 L 10 22 L 8 18 L 8 8 Z ' +
    'M 11 9 A 0.8 1 0 1 0 11 9.01 ' +
    'M 13 9 A 0.8 1 0 1 0 13 9.01 ' +
    'M 12 13 L 12 17',
  // Apex — final boss. Crowned skull with radiating spikes.
  apex:
    'M 5 14 C 5 8 8 4 12 4 C 16 4 19 8 19 14 L 19 18 ' +
    'L 16 18 L 16 21 L 13 21 L 13 18 L 11 18 L 11 21 L 8 21 L 8 18 L 5 18 Z ' +
    'M 8 11 L 10 13 M 10 11 L 8 13 ' +
    'M 14 11 L 16 13 M 16 11 L 14 13 ' +
    'M 9 16 L 11 17 L 12 16 L 13 17 L 15 16 ' +
    'M 12 4 L 12 0 M 8 5 L 6 1 M 16 5 L 18 1 ' +
    'M 5 8 L 1 6 M 19 8 L 23 6',
};

export const ENEMY_ICON_COLORS: Record<EnemyKind, string> = {
  mote: COLORS.textMuted,
  sprite: COLORS.cyan,
  worm: COLORS.secondary,
  packet: COLORS.cyan,
  drone: COLORS.cyan,
  crawler: COLORS.amber,
  stalker: COLORS.acid,
  phantom: COLORS.textMuted,
  trojan: COLORS.tertiary,
  bastion: COLORS.amber,
  forkbomb: COLORS.tertiary,
  cache: COLORS.acid,
  reaper: COLORS.danger,
  knight: COLORS.amber,
  sentinel: COLORS.cyan,
  construct: COLORS.tertiary,
  bulwark: COLORS.textMuted,
  daemon: COLORS.danger,
  rootkit: COLORS.magenta,
  wraith: COLORS.cyan,
  hypervisor: COLORS.amber,
  kernelghost: COLORS.acid,
  'firmware-leech': COLORS.tertiary,
  'darknet-titan': COLORS.danger,
  'quantum-shade': COLORS.primary,
  'logic-gate': COLORS.amber,
  voidwalker: COLORS.textMuted,
  apex: COLORS.textPrimary,
};

/**
 * Bake the SVG into a Skia path scaled to `sizePx` and centered at the origin.
 * Same two-step matrix trick as `makeTowerIconPath` — translate the 24×24 box
 * to origin, then scale.
 */
export function makeEnemyIconPath(kind: EnemyKind, sizePx: number): SkPath {
  const path = Skia.Path.MakeFromSVGString(ENEMY_ICON_SVG[kind]);
  if (!path) throw new Error(`Invalid SVG path for enemy icon: ${kind}`);
  // Center on the glyph's actual bounding box rather than the nominal
  // viewBox — same fix as the tower icons (see towerIcons.ts).
  const bounds = path.computeTightBounds();
  const cxRaw = bounds.x + bounds.width / 2;
  const cyRaw = bounds.y + bounds.height / 2;
  const center = Skia.Matrix();
  center.translate(-cxRaw, -cyRaw);
  path.transform(center);
  const span = Math.max(bounds.width, bounds.height) || ENEMY_ICON_VIEWBOX;
  const scale = Skia.Matrix();
  const s = sizePx / span;
  scale.scale(s, s);
  path.transform(scale);
  return path;
}

export const ENEMY_ICON_KINDS: readonly EnemyKind[] = [
  'mote', 'sprite', 'worm', 'packet', 'drone', 'crawler', 'stalker', 'phantom',
  'trojan', 'bastion', 'forkbomb', 'cache',
  'reaper', 'knight', 'sentinel', 'construct', 'bulwark',
  'daemon', 'rootkit', 'wraith', 'hypervisor', 'kernelghost',
  'firmware-leech', 'darknet-titan', 'quantum-shade', 'logic-gate', 'voidwalker', 'apex',
];
