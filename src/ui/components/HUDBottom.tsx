import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Canvas, Path } from '@shopify/react-native-skia';
import { ALL_TOWER_DEFS } from '@/content/towerDefs';
import { useHudStore } from '@/ui/hudStore';
import type { TowerKind } from '@/content/types';
import { TOWER_ICON_COLORS, makeTowerIconPath } from '@/render/towerIcons';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

const ICON_SIZE = 28;

export function HUDBottom({
  selected, onSelect,
}: { selected: TowerKind | null; onSelect: (k: TowerKind | null) => void }) {
  const credits = useHudStore((s) => s.credits);
  const someoneSelected = selected !== null;
  return (
    <View style={styles.root}>
      {ALL_TOWER_DEFS.map((def) => {
        const affordable = credits >= def.cost;
        const isSelected = selected === def.kind;
        const dimmed = !isSelected && (someoneSelected || !affordable);
        return (
          <Pressable
            key={def.kind}
            onPress={() => onSelect(isSelected ? null : def.kind)}
            disabled={!affordable && !isSelected}
            style={[
              styles.cell,
              isSelected && styles.cellSelected,
              dimmed && styles.cellDisabled,
            ]}
          >
            <TowerIcon kind={def.kind} />
            <Text style={[styles.name, isSelected && styles.nameSelected]}>{def.displayName}</Text>
            <Text style={[styles.cost, isSelected && styles.costSelected]}>{def.cost} ¢</Text>
          </Pressable>
        );
      })}
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
    flexDirection: 'row',
    padding: SPACING.sm,
    gap: SPACING.sm,
    backgroundColor: COLORS.bgCard,
  },
  cell: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
    gap: 2,
  },
  cellSelected: { backgroundColor: COLORS.primary },
  cellDisabled: { opacity: 0.45 },
  icon: { width: ICON_SIZE, height: ICON_SIZE },
  name: { ...TEXT.labelSmall, color: COLORS.textPrimary, fontSize: 11 },
  nameSelected: { color: COLORS.textOnAccent },
  cost: { ...TEXT.buttonSmall, color: COLORS.tertiary },
  costSelected: { color: COLORS.textOnAccent },
});
