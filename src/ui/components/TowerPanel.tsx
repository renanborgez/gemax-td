import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useHudStore } from '@/ui/hudStore';
import type { GameSession } from '@/render/useGameSession';
import { getTowerDef } from '@/entities/registry';
import type { TowerKind } from '@/content/types';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

export function TowerPanel({ session }: { session: GameSession }) {
  const selectedId = useHudStore((s) => s.selectedTowerId);
  // Force re-render after upgrade/sell so derived values (level, cost) refresh.
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  const w = session.worldRef.current;
  const t = selectedId ? w.selection.tower : undefined;
  const visible = selectedId !== null && !!t;
  const def = t ? getTowerDef(t.defKind as TowerKind) : null;

  const onSell = () => {
    if (!t || !def) return;
    const refund = Math.round(def.cost * w.effects.globals.sellRebateRatio);
    t.alive = false;
    w.grid.vacate(t.tileCoord);
    w.credits += refund;
    w.bus.emit('tower-sold', { towerId: t.id, refund });
    w.bus.emit('credits-changed', { credits: w.credits });
    session.selectTower(null);
  };

  const onUpgrade = () => {
    if (!t || !def) return;
    if (t.level >= 3) return;
    const next = def.upgrades[t.level - 1];
    if (!next || w.credits < next.cost) return;
    w.credits -= next.cost;
    t.level = (t.level + 1) as 1 | 2 | 3;
    t.base = { range: next.range, fireRate: next.fireRate, damage: next.damage };
    w.bus.emit('tower-upgraded', { towerId: t.id, toLevel: t.level });
    w.bus.emit('credits-changed', { credits: w.credits });
    session.refreshRange();
    bump();
  };

  const nextUpgrade = t && def && t.level < 3 ? def.upgrades[t.level - 1] ?? null : null;

  return (
    <View style={[styles.root, !visible && styles.hidden]} pointerEvents={visible ? 'auto' : 'none'}>
      {t && def && (
        <>
          <Text style={styles.title}>{def.displayName} <Text style={styles.level}>L{t.level}</Text></Text>
          <View style={styles.statRow}>
            <StatCell
              label="DMG"
              current={t.base.damage}
              {...(nextUpgrade ? { next: nextUpgrade.damage } : {})}
            />
            <StatCell
              label="RNG"
              current={t.base.range}
              {...(nextUpgrade ? { next: nextUpgrade.range } : {})}
            />
            <StatCell
              label="RPS"
              current={t.base.fireRate}
              {...(nextUpgrade ? { next: nextUpgrade.fireRate } : {})}
            />
          </View>
          <View style={styles.actions}>
            {nextUpgrade && (
              <Pressable onPress={onUpgrade} style={styles.upgrade}>
                <Text style={styles.upgradeText}>UPGRADE {nextUpgrade.cost} ¢</Text>
              </Pressable>
            )}
            <Pressable onPress={onSell} style={styles.sell}>
              <Text style={styles.sellText}>SELL</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function StatCell({ label, current, next }: { label: string; current: number; next?: number }) {
  const showDelta = next !== undefined && next !== current;
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{fmt(current)}</Text>
        {showDelta && (
          <Text style={styles.statNext}>→ {fmt(next!)}</Text>
        )}
      </View>
    </View>
  );
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
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
  hidden: { opacity: 0 },
  title: { ...TEXT.label, fontSize: 13 },
  level: { color: COLORS.primary },
  statRow: { flexDirection: 'row', gap: SPACING.sm },
  statCell: { flex: 1, gap: 2 },
  statLabel: { ...TEXT.labelSmall },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statValue: { ...TEXT.hudValue, fontSize: 13, color: COLORS.textPrimary },
  statNext: { ...TEXT.labelSmall, color: COLORS.secondary, fontSize: 9 },
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
