import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Canvas, Path } from '@shopify/react-native-skia';
import { ALL_TOWER_DEFS } from '@/content/towerDefs';
import { useHudStore } from '@/ui/hudStore';
import { useSave } from '@/app/providers/SaveProvider';
import { normalizeLoadout } from '@/meta/loadout';
import type { TowerKind } from '@/content/types';
import { TOWER_ICON_COLORS, makeTowerIconPath } from '@/render/towerIcons';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

const ICON_SIZE = 28;
const GAP = 8;

export type PickerAnchor = { x: number; y: number; tile: number };

export function TowerPicker({
  visible, anchor, containerWidth, containerHeight, onPick, onDismiss,
}: {
  visible: boolean;
  anchor: PickerAnchor | null;
  containerWidth: number;
  containerHeight: number;
  onPick: (k: TowerKind) => void;
  onDismiss: () => void;
}) {
  const credits = useHudStore((s) => s.credits);
  const { data } = useSave();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const loadoutDefs = useMemo(() => {
    const slots = normalizeLoadout(data.meta.activeLoadout);
    const byKind = new Map(ALL_TOWER_DEFS.map((d) => [d.kind, d] as const));
    const filled = slots
      .map((k) => (k === null ? undefined : byKind.get(k)))
      .filter((d): d is typeof ALL_TOWER_DEFS[number] => d !== undefined);
    return filled.length === 0 ? ALL_TOWER_DEFS : filled;
  }, [data.meta.activeLoadout]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (size && size.w === width && size.h === height) return;
    setSize({ w: width, h: height });
  };

  // Place picker centered horizontally on cell, above by default; flip below
  // if no room above. Clamp horizontally within the container.
  const computed = useMemo(() => {
    if (!anchor || !size || containerWidth <= 0 || containerHeight <= 0) return null;
    const halfTile = anchor.tile / 2;
    const wantTop = anchor.y - halfTile - GAP - size.h;
    const top = wantTop >= SPACING.sm ? wantTop : anchor.y + halfTile + GAP;
    const rawLeft = anchor.x - size.w / 2;
    const left = Math.max(SPACING.sm, Math.min(containerWidth - size.w - SPACING.sm, rawLeft));
    return { left, top };
  }, [anchor, size, containerWidth, containerHeight]);

  // Hold last computed position so closing the picker (anchor → null) doesn't
  // snap the subtree back to (0, 0). RN layout shifts on hide were causing
  // Skia Canvases inside to refresh native surfaces, freezing for a frame on
  // close — pin to last position and just flip opacity/pointerEvents.
  const lastPosRef = useRef<{ left: number; top: number } | null>(null);
  if (computed) lastPosRef.current = computed;
  const position = computed ?? lastPosRef.current;
  const ready = position !== null;

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.root,
        ready
          ? { left: position!.left, top: position!.top }
          : styles.measuring,
        !visible && styles.hidden,
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>PLACE TOWER</Text>
        <Pressable onPress={onDismiss} style={styles.close} hitSlop={8}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        {loadoutDefs.map((def) => {
          const affordable = credits >= def.cost;
          return (
            <Pressable
              key={def.kind}
              onPress={() => onPick(def.kind)}
              disabled={!affordable}
              style={[styles.cell, !affordable && styles.cellDisabled]}
            >
              <TowerIcon kind={def.kind} />
              <Text style={styles.name}>{def.displayName}</Text>
              <Text style={[styles.cost, !affordable && styles.costShort]}>{def.cost} ¢</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const TowerIcon = React.memo(TowerIconImpl);

function TowerIconImpl({ kind }: { kind: TowerKind }) {
  const path = useMemo(() => makeTowerIconPath(kind, ICON_SIZE), [kind]);
  return (
    <Canvas style={styles.icon}>
      <Path
        path={path}
        transform={[{ translateX: ICON_SIZE / 2 }, { translateY: ICON_SIZE / 2 }]}
        style="stroke"
        strokeWidth={1.5}
        strokeJoin="round"
        strokeCap="round"
        color={TOWER_ICON_COLORS[kind]}
      />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    gap: SPACING.sm,
    alignSelf: 'flex-start',
  },
  // Pre-warm Skia Canvases at on-screen 0,0 with opacity 0 so the first reveal
  // doesn't trigger 4 native surface paints on the same frame as the tap.
  measuring: { left: 0, top: 0, opacity: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xs,
    gap: SPACING.sm,
    height: 24,
  },
  title: {
    ...TEXT.labelSmall,
    color: COLORS.textMuted,
    lineHeight: 24,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  close: {
    width: 24, height: 24,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.bgElevated,
  },
  closeText: { ...TEXT.buttonSmall, color: COLORS.textPrimary },
  row: { flexDirection: 'row', gap: SPACING.sm },
  cell: {
    width: 92,
    height: 72,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  cellDisabled: { opacity: 0.45 },
  hidden: { opacity: 0 },
  icon: { width: ICON_SIZE, height: ICON_SIZE },
  name: { ...TEXT.labelSmall, color: COLORS.textPrimary, fontSize: 11, textAlign: 'center' },
  cost: { ...TEXT.buttonSmall, color: COLORS.tertiary },
  costShort: { color: COLORS.danger },
});
