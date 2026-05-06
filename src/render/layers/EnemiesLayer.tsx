import React, { useCallback, useMemo } from 'react';
import { Group, Path, Rect, type SkPath } from '@shopify/react-native-skia';
import {
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import type { Viewport } from '@/engine/Viewport';
import type { WorldSnapshot } from '@/render/snapshot';
import { COLORS } from '@/render/theme';
import {
  ENEMY_ICON_KINDS,
  ENEMY_ICON_COLORS,
  makeEnemyIconPath,
} from '@/render/enemyIcons';
import type { EnemyKind } from '@/content/types';

// Cap matched to peak concurrent enemies in level wave defs (~25 worms + a
// few of other kinds). 64 leaves plenty of headroom for future content while
// avoiding the worklet storm of the prior 200-slot cap. Each unused slot still
// runs all of its useDerivedValue worklets every frame.
const MAX_ENEMIES = 64;

export function EnemiesLayer({
  viewport, snapshot,
}: { viewport: Viewport; snapshot: SharedValue<WorldSnapshot> }) {
  const tileSize = viewport.tileSize;
  // Bake one Skia path per enemy kind, sized to the enemy's drawing area.
  // Memoized on tileSize (stable for the world's lifetime).
  const iconPaths = useMemo(() => {
    const iconSize = tileSize * 0.6;
    return Object.fromEntries(
      ENEMY_ICON_KINDS.map((k) => [k, makeEnemyIconPath(k, iconSize)]),
    ) as Record<EnemyKind, SkPath>;
  }, [tileSize]);
  // Fallback path for empty slots — Path requires a non-null SkPath even when
  // opacity is 0. Pick any baked kind; opacity worklet keeps it invisible.
  const fallbackPath = iconPaths[ENEMY_ICON_KINDS[0]!];

  // Single shared clock (seconds) drives all per-kind procedural motion. Gated
  // by enemy presence so paused states don't fire 64 transform worklets/frame.
  const clock = useSharedValue(0);
  const frame = useFrameCallback((info) => {
    'worklet';
    clock.value = info.timestamp / 1000;
  }, false);
  const setFrameActive = useCallback((a: boolean) => frame.setActive(a), [frame]);
  useAnimatedReaction(
    () => snapshot.value.enemies.length > 0,
    (curr, prev) => {
      if (curr !== prev) runOnJS(setFrameActive)(curr);
    },
  );

  return (
    <Group>
      {Array.from({ length: MAX_ENEMIES }, (_, i) => (
        <EnemySlot
          key={i}
          index={i}
          snapshot={snapshot}
          viewport={viewport}
          iconPaths={iconPaths}
          fallbackPath={fallbackPath}
          clock={clock}
        />
      ))}
    </Group>
  );
}

function EnemySlot({
  index, snapshot, viewport, iconPaths, fallbackPath, clock,
}: {
  index: number;
  snapshot: SharedValue<WorldSnapshot>;
  viewport: Viewport;
  iconPaths: Record<EnemyKind, SkPath>;
  fallbackPath: SkPath;
  clock: SharedValue<number>;
}) {
  const tileSize = viewport.tileSize;
  // Half-extent of the icon — used to position the HP bar above the glyph.
  const r = tileSize * 0.3;
  const strokeWidth = Math.max(1.1, tileSize * 0.035);
  // Per-kind bob/scale magnitudes scale with tile size so motion stays
  // proportional across zoom levels.
  const bob = tileSize * 0.06;

  // Single derived position+visibility — Skia layers can read the same
  // SharedValue for cx/cy and Group transform without spawning extra worklets.
  const cx = useDerivedValue(() => (snapshot.value.enemies[index]?.x ?? -1000) * tileSize);
  const cy = useDerivedValue(() => (snapshot.value.enemies[index]?.y ?? -1000) * tileSize);
  const opacity = useDerivedValue(() => {
    if (index >= snapshot.value.enemies.length) return 0;
    return snapshot.value.enemies[index]?.untargetable ? 0.35 : 1;
  });
  // Per-kind procedural motion folded into the existing transform worklet —
  // no new derived values per slot. Phase staggered by index so a swarm of the
  // same kind doesn't pulse in lockstep.
  //
  // Heading: "forward"-oriented glyphs (drawn facing +x) rotate to match the
  // path tangent so packets/worms/etc. point where they travel. "Upright"
  // glyphs (crown/antennae up) only mirror horizontally based on heading sign,
  // so they don't flop on their side at corners.
  const transform = useDerivedValue(() => {
    const snap = snapshot.value.enemies[index];
    const kind = snap?.defKind;
    const heading = snap?.heading ?? 0;
    const t = clock.value + index * 0.37;
    let tx = 0, ty = 0, sx = 1, sy = 1, rot = 0;
    if (kind === 'worm') {
      const w = Math.sin(t * 8);
      sy = 1 + 0.18 * w;
      sx = 1 - 0.08 * w;
    } else if (kind === 'daemon') {
      ty = Math.sin(t * 4) * bob;
    } else if (kind === 'trojan') {
      rot = Math.sin(t * 2) * 0.08;
    } else if (kind === 'rootkit') {
      const p = 1 + 0.08 * Math.sin(t * 3);
      sx = p; sy = p;
    } else if (kind === 'wraith') {
      ty = Math.sin(t * 2.5) * bob * 1.4;
      const p = 1 + 0.05 * Math.sin(t * 5);
      sx = p; sy = p;
    } else if (kind === 'hypervisor') {
      tx = Math.sin(t * 2) * bob * 0.6;
      const p = 1 + 0.04 * Math.sin(t * 1.5);
      sy = p;
    } else if (kind === 'kernelghost') {
      ty = Math.sin(t * 2.2) * bob * 1.6;
      rot = Math.sin(t * 1.5) * 0.05;
      const p = 1 + 0.07 * Math.sin(t * 2.5);
      sx = p; sy = p;
    } else if (kind === 'firmware-leech') {
      tx = Math.sin(t * 5) * bob * 1.2;
      sy = 1 + 0.12 * Math.sin(t * 7);
    } else if (kind === 'darknet-titan') {
      sy = 1 + 0.08 * Math.sin(t * 1.5);
      sx = 1 - 0.04 * Math.sin(t * 1.5);
    } else if (kind === 'quantum-shade') {
      const p = 1 + 0.1 * Math.sin(t * 6);
      sx = p; sy = p;
      rot = Math.sin(t * 3) * 0.06;
    } else if (kind === 'logic-gate') {
      rot = Math.sin(t * 0.8) * 0.03;
      tx = Math.sin(t * 4) * bob * 0.4;
    } else if (kind === 'voidwalker') {
      ty = Math.sin(t * 1.2) * bob * 1.8;
      const p = 1 + 0.04 * Math.sin(t * 1.0);
      sy = p;
    } else if (kind === 'apex') {
      const p = 1 + 0.09 * Math.sin(t * 1.5);
      sx = p; sy = p;
      rot = Math.sin(t * 0.7) * 0.04;
    } else if (kind === 'mote') {
      // Tiny swarm filler — fast scale flicker.
      const p = 1 + 0.18 * Math.sin(t * 9);
      sx = p; sy = p;
    } else if (kind === 'sprite') {
      // Twinkling star — continuous spin + scale pulse.
      rot = t * 1.6;
      const p = 1 + 0.1 * Math.sin(t * 6);
      sx = p; sy = p;
    } else if (kind === 'packet') {
      // Dart — quick horizontal jitter to imply velocity.
      tx = Math.sin(t * 12) * bob * 0.4;
      sx = 1 + 0.06 * Math.sin(t * 12);
    } else if (kind === 'drone') {
      // Hovering quad — subtle vertical bob + tiny tilt.
      ty = Math.sin(t * 5) * bob * 0.5;
      rot = Math.sin(t * 2) * 0.04;
    } else if (kind === 'crawler') {
      // Six-legged scuttle — leg-cycle scale wobble.
      sy = 1 + 0.1 * Math.sin(t * 10);
      sx = 1 - 0.05 * Math.sin(t * 10);
    } else if (kind === 'stalker') {
      // Predator triangle — predatory bob + small lateral sway.
      ty = Math.sin(t * 3.5) * bob * 0.8;
      tx = Math.sin(t * 1.7) * bob * 0.4;
    } else if (kind === 'phantom') {
      // Hooded silhouette — drifting bob + slight rotation.
      ty = Math.sin(t * 1.8) * bob * 1.2;
      rot = Math.sin(t * 1.2) * 0.05;
    } else if (kind === 'bastion') {
      // Armored shield — heavy slow sway, no pulse.
      rot = Math.sin(t * 1.2) * 0.04;
      ty = Math.sin(t * 1.2) * bob * 0.3;
    } else if (kind === 'forkbomb') {
      // Branching tree — twitchy scale spasms.
      const p = 1 + 0.12 * Math.sin(t * 7);
      sx = p; sy = p;
      rot = Math.sin(t * 5) * 0.03;
    } else if (kind === 'cache') {
      // Concentric rings — heal-pulse breathing.
      const p = 1 + 0.08 * Math.sin(t * 2.2);
      sx = p; sy = p;
    } else if (kind === 'reaper') {
      // Hooded scythe — slow ominous bob + sway.
      ty = Math.sin(t * 1.6) * bob * 1.4;
      rot = Math.sin(t * 1.0) * 0.05;
    } else if (kind === 'knight') {
      // Greathelm — heavy stoic sway.
      rot = Math.sin(t * 1.0) * 0.04;
      ty = Math.sin(t * 2.0) * bob * 0.3;
    } else if (kind === 'sentinel') {
      // Eye-flier — wing-flap (sx pulse) + bob.
      sx = 1 + 0.1 * Math.sin(t * 6);
      ty = Math.sin(t * 6) * bob * 0.4;
    } else if (kind === 'construct') {
      // Blocky golem — heavy stomp compression.
      sy = 1 + 0.07 * Math.sin(t * 1.8);
      sx = 1 - 0.04 * Math.sin(t * 1.8);
    } else if (kind === 'bulwark') {
      // Crenellated keep — minimal sway, very stoic.
      rot = Math.sin(t * 0.9) * 0.02;
      sy = 1 + 0.03 * Math.sin(t * 1.4);
    }

    // Glyphs whose natural orientation is "standing up" — don't rotate them
    // along the path tangent; just mirror horizontally on leftward travel.
    const upright = kind === 'knight' || kind === 'apex' || kind === 'trojan'
      || kind === 'reaper' || kind === 'daemon' || kind === 'construct'
      || kind === 'bulwark' || kind === 'bastion' || kind === 'forkbomb'
      || kind === 'voidwalker' || kind === 'darknet-titan' || kind === 'rootkit'
      || kind === 'wraith' || kind === 'phantom' || kind === 'kernelghost';
    if (upright) {
      if (Math.cos(heading) < 0) sx = -sx;
    } else {
      rot += heading;
    }
    return [
      { translateX: cx.value + tx },
      { translateY: cy.value + ty },
      { rotate: rot },
      { scaleX: sx },
      { scaleY: sy },
    ];
  });
  const hpFrac = useDerivedValue(() => {
    const s = snapshot.value.enemies[index];
    return s ? Math.max(0, Math.min(1, s.hp / s.maxHp)) : 0;
  });
  const barX = useDerivedValue(() => cx.value - r);
  const barY = useDerivedValue(() => cy.value - r * 1.3);
  const fillW = useDerivedValue(() => r * 2 * hpFrac.value);

  // Single Path per slot whose geometry + color swap with the active enemy
  // kind. Replaces a stack of 28 sibling Paths each with its own visibility
  // worklet (was 28 worklets/slot just for kind selection).
  const glyphPath = useDerivedValue<SkPath>(() => {
    const kind = snapshot.value.enemies[index]?.defKind as EnemyKind | undefined;
    if (!kind) return fallbackPath;
    return iconPaths[kind] ?? fallbackPath;
  });
  const glyphColor = useDerivedValue<string>(() => {
    const kind = snapshot.value.enemies[index]?.defKind as EnemyKind | undefined;
    if (!kind) return COLORS.textMuted;
    return ENEMY_ICON_COLORS[kind] ?? COLORS.textMuted;
  });

  return (
    <Group opacity={opacity}>
      <Group transform={transform}>
        <Path
          path={glyphPath}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeJoin="round"
          strokeCap="round"
          color={glyphColor}
        />
      </Group>
      <Rect x={barX} y={barY} width={r * 2} height={3} color={COLORS.enemyHpBg} />
      <Rect x={barX} y={barY} width={fillW} height={3} color={COLORS.enemyHp} />
    </Group>
  );
}
