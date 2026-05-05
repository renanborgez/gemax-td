import React from 'react';
import { Text, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useHudStore } from '@/ui/hudStore';
import type { GameSession } from '@/render/useGameSession';
import { getTowerDef } from '@/entities/registry';
import type { TowerKind } from '@/content/types';
import { upgradeCost } from '@/content/towerCostFormula';
import type { Viewport } from '@/engine/Viewport';
import type { Camera } from '@/render/useCamera';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

const ANCHOR_GAP = 12;
const EDGE_PAD = SPACING.sm;

export const TowerPanel = React.memo(TowerPanelImpl);

function TowerPanelImpl({
  session,
  viewport,
  camera,
  containerWidth,
  containerHeight,
}: {
  session: GameSession;
  viewport: Viewport | null;
  camera: Camera;
  containerWidth: number;
  containerHeight: number;
}) {
  const selectedId = useHudStore((s) => s.selectedTowerId);
  // Force re-render after upgrade/sell so derived values (level, cost) refresh.
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  const w = session.worldRef.current;
  const t = selectedId ? w.selection.tower : undefined;
  const def = t ? getTowerDef(t.defKind as TowerKind) : null;
  const visible = selectedId !== null && !!t && !!viewport;

  const tileCoord = t?.tileCoord ?? null;
  const worldX = viewport && tileCoord ? viewport.gridToWorld(tileCoord).x : 0;
  const worldY = viewport && tileCoord ? viewport.gridToWorld(tileCoord).y : 0;
  const tileSize = viewport?.tileSize ?? 0;

  // Panel measurement (shared so worklet can clamp without crossing threads).
  const panelW = useSharedValue(0);
  const panelH = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    panelW.value = e.nativeEvent.layout.width;
    panelH.value = e.nativeEvent.layout.height;
  };

  const animStyle = useAnimatedStyle(() => {
    if (!visible) {
      return { transform: [{ translateX: 0 }, { translateY: 0 }] };
    }
    const z = camera.zoom.value;
    const screenX = camera.panX.value + worldX * z;
    const screenY = camera.panY.value + worldY * z;
    const half = (tileSize * z) / 2;
    const pw = panelW.value;
    const ph = panelH.value;

    // Prefer above the tower; flip below if no room.
    const wantTop = screenY - half - ANCHOR_GAP - ph;
    const top =
      wantTop >= EDGE_PAD
        ? wantTop
        : Math.min(containerHeight - ph - EDGE_PAD, screenY + half + ANCHOR_GAP);

    // Center on tower, clamp to container width.
    const rawLeft = screenX - pw / 2;
    const left = Math.max(EDGE_PAD, Math.min(containerWidth - pw - EDGE_PAD, rawLeft));

    return { transform: [{ translateX: left }, { translateY: top }] };
  });

  const onSell = () => {
    if (!t || !def) return;
    let totalSpent = def.cost;
    for (let tier = 1; tier < t.level; tier++) {
      totalSpent += upgradeCost(def.cost, tier);
    }
    const refund = Math.round(totalSpent * w.effects.globals.sellRebateRatio);
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
    if (!next) return;
    const price = upgradeCost(def.cost, t.level);
    if (w.credits < price) return;
    w.credits -= price;
    t.level = (t.level + 1) as 1 | 2 | 3;
    t.base = { range: next.range, fireRate: next.fireRate, damage: next.damage };
    w.bus.emit('tower-upgraded', { towerId: t.id, toLevel: t.level });
    w.bus.emit('credits-changed', { credits: w.credits });
    session.refreshRange();
    bump();
  };

  const nextUpgrade = t && def && t.level < 3 ? def.upgrades[t.level - 1] ?? null : null;
  const nextUpgradePrice = t && def && t.level < 3 ? upgradeCost(def.cost, t.level) : 0;

  return (
    <Animated.View
      onLayout={onLayout}
      style={[styles.root, animStyle, !visible && styles.hidden]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {t && def && (
        <>
          <Text style={styles.title}>
            {def.displayName} <Text style={styles.level}>L{t.level}</Text>
          </Text>
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
                <Text style={styles.upgradeText}>UPGRADE {nextUpgradePrice} ¢</Text>
              </Pressable>
            )}
            <Pressable onPress={onSell} style={styles.sell}>
              <Text style={styles.sellText}>SELL</Text>
            </Pressable>
          </View>
        </>
      )}
    </Animated.View>
  );
}

function StatCell({ label, current, next }: { label: string; current: number; next?: number }) {
  const pct = next !== undefined && current > 0 ? Math.round(((next - current) / current) * 100) : 0;
  const showDelta = next !== undefined && pct !== 0;
  const positive = pct > 0;
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{fmt(current)}</Text>
        {showDelta && (
          <Text style={[styles.statNext, !positive && styles.statNextDown]}>
            {positive ? '+' : ''}{pct}%
          </Text>
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
    left: 0,
    top: 0,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
    minWidth: 180,
    alignSelf: 'flex-start',
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
  statNextDown: { color: COLORS.danger },
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
