import React, { useCallback, useMemo } from 'react';
import { Group, Path, Rect } from '@shopify/react-native-skia';
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
    ) as Record<EnemyKind, ReturnType<typeof makeEnemyIconPath>>;
  }, [tileSize]);

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
          clock={clock}
        />
      ))}
    </Group>
  );
}

function EnemySlot({
  index, snapshot, viewport, iconPaths, clock,
}: {
  index: number;
  snapshot: SharedValue<WorldSnapshot>;
  viewport: Viewport;
  iconPaths: Record<EnemyKind, ReturnType<typeof makeEnemyIconPath>>;
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
  const opacity = useDerivedValue(() => (index < snapshot.value.enemies.length ? 1 : 0));
  // Per-kind procedural motion folded into the existing transform worklet —
  // no new derived values per slot. Phase staggered by index so a swarm of the
  // same kind doesn't pulse in lockstep.
  const transform = useDerivedValue(() => {
    const kind = snapshot.value.enemies[index]?.defKind;
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

  return (
    <Group opacity={opacity}>
      <Group transform={transform}>
        {ENEMY_ICON_KINDS.map((kind) => (
          <EnemyIconGlyph
            key={kind}
            kind={kind}
            index={index}
            snapshot={snapshot}
            path={iconPaths[kind]}
            strokeWidth={strokeWidth}
          />
        ))}
      </Group>
      <Rect x={barX} y={barY} width={r * 2} height={3} color={COLORS.enemyHpBg} />
      <Rect x={barX} y={barY} width={fillW} height={3} color={COLORS.enemyHp} />
    </Group>
  );
}

function EnemyIconGlyph({
  kind, index, snapshot, path, strokeWidth,
}: {
  kind: EnemyKind;
  index: number;
  snapshot: SharedValue<WorldSnapshot>;
  path: ReturnType<typeof makeEnemyIconPath>;
  strokeWidth: number;
}) {
  const visible = useDerivedValue(() =>
    snapshot.value.enemies[index]?.defKind === kind ? 1 : 0,
  );
  return (
    <Path
      path={path}
      style="stroke"
      strokeWidth={strokeWidth}
      strokeJoin="round"
      strokeCap="round"
      color={ENEMY_ICON_COLORS[kind]}
      opacity={visible}
    />
  );
}
