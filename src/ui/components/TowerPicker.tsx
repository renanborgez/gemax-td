import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Canvas, Path } from '@shopify/react-native-skia';
import { ALL_TOWER_DEFS } from '@/content/towerDefs';
import { useHudStore } from '@/ui/hudStore';
import { useSave } from '@/app/providers/SaveProvider';
import { normalizeLoadout } from '@/meta/loadout';
import type { TowerKind } from '@/content/types';
import { TOWER_ICON_COLORS, makeTowerIconPath } from '@/render/towerIcons';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

const ICON_SIZE = 28;

export function TowerPicker({
  visible, onPick, onDismiss,
}: {
  visible: boolean;
  onPick: (k: TowerKind) => void;
  onDismiss: () => void;
}) {
  const credits = useHudStore((s) => s.credits);
  const { data } = useSave();
  // Show only the active loadout, in slot order. Null slots (deployed-then-removed)
  // are skipped so the picker doesn't render empty cells. If every slot is
  // empty, fall back to the full def list so the picker is never blank.
  const loadoutDefs = useMemo(() => {
    const slots = normalizeLoadout(data.meta.activeLoadout);
    const byKind = new Map(ALL_TOWER_DEFS.map((d) => [d.kind, d] as const));
    const filled = slots
      .map((k) => (k === null ? undefined : byKind.get(k)))
      .filter((d): d is typeof ALL_TOWER_DEFS[number] => d !== undefined);
    return filled.length === 0 ? ALL_TOWER_DEFS : filled;
  }, [data.meta.activeLoadout]);

  // Stay mounted even when hidden so the per-icon Skia Canvases — each of which
  // owns a native Metal/GL surface — don't get torn down and rebuilt on every
  // open. Opening/closing the picker was previously visibly slow because of
  // this mount churn. Hidden via opacity + pointerEvents.
  return (
    <View
      style={[styles.root, !visible && styles.hidden]}
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

function TowerIcon({ kind }: { kind: TowerKind }) {
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
    left: SPACING.sm,
    right: SPACING.sm,
    bottom: SPACING.sm,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xs,
  },
  title: { ...TEXT.labelSmall, color: COLORS.textMuted },
  close: {
    width: 24, height: 24,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.bgElevated,
  },
  closeText: { ...TEXT.buttonSmall, color: COLORS.textPrimary },
  row: { flexDirection: 'row', gap: SPACING.sm },
  cell: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    gap: 2,
  },
  cellDisabled: { opacity: 0.45 },
  hidden: { opacity: 0 },
  icon: { width: ICON_SIZE, height: ICON_SIZE },
  name: { ...TEXT.labelSmall, color: COLORS.textPrimary, fontSize: 11 },
  cost: { ...TEXT.buttonSmall, color: COLORS.tertiary },
  costShort: { color: COLORS.danger },
});
