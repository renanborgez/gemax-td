import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useHudStore } from '@/ui/hudStore';
import type { World } from '@/world/World';
import type { TargetPriority } from '@/entities/Tower';
import { getTowerDef } from '@/entities/registry';
import type { TowerKind } from '@/content/types';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

const PRIORITIES: readonly TargetPriority[] = ['first', 'last', 'strongest', 'weakest', 'closest'];

export function TowerPanel({ worldRef }: { worldRef: { current: World } }) {
  const selectedId = useHudStore((s) => s.selectedTowerId);
  if (!selectedId) return null;
  const w = worldRef.current;
  const t = w.entities.towers.find((x) => x.id === selectedId);
  if (!t) return null;
  const def = getTowerDef(t.defKind as TowerKind);

  const onSell = () => {
    const refund = Math.round(def.cost * w.effects.globals.sellRebateRatio);
    t.alive = false;
    w.grid.vacate(t.tileCoord);
    w.credits += refund;
    w.bus.emit('tower-sold', { towerId: t.id, refund });
    w.bus.emit('credits-changed', { credits: w.credits });
    w.selection = {};
    useHudStore.getState().setSelectedTowerId(null);
  };

  const onUpgrade = () => {
    if (t.level >= 3) return;
    const next = def.upgrades[t.level - 1];
    if (!next || w.credits < next.cost) return;
    w.credits -= next.cost;
    t.level = (t.level + 1) as 1 | 2 | 3;
    t.base = { range: next.range, fireRate: next.fireRate, damage: next.damage };
    w.bus.emit('tower-upgraded', { towerId: t.id, toLevel: t.level });
    w.bus.emit('credits-changed', { credits: w.credits });
  };

  const onPriority = (p: TargetPriority) => { t.targetPriority = p; };

  const upgradeCost = t.level < 3 ? def.upgrades[t.level - 1]?.cost : null;

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{def.displayName} <Text style={styles.level}>L{t.level}</Text></Text>
      <View style={styles.row}>
        {PRIORITIES.map((p) => {
          const active = t.targetPriority === p;
          return (
            <Pressable
              key={p}
              onPress={() => onPriority(p)}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {p[0]!.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.actions}>
        {upgradeCost != null && (
          <Pressable onPress={onUpgrade} style={styles.upgrade}>
            <Text style={styles.upgradeText}>UPGRADE {upgradeCost} ¢</Text>
          </Pressable>
        )}
        <Pressable onPress={onSell} style={styles.sell}>
          <Text style={styles.sellText}>SELL</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: SPACING.sm,
    top: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgCard,
    gap: SPACING.sm,
    minWidth: 160,
  },
  title: { ...TEXT.label, fontSize: 13 },
  level: { color: COLORS.primary },
  row: { flexDirection: 'row', gap: 4 },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgElevated,
  },
  pillActive: { backgroundColor: COLORS.tertiary },
  pillText: { ...TEXT.buttonSmall, color: COLORS.textMuted, fontSize: 12 },
  pillTextActive: { color: COLORS.textOnAccent },
  actions: { gap: SPACING.xs },
  upgrade: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.secondary,
  },
  upgradeText: { ...TEXT.buttonSmall, color: COLORS.textOnAccent },
  sell: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.danger,
    borderWidth: 1,
  },
  sellText: { ...TEXT.buttonSmall, color: COLORS.danger },
});
