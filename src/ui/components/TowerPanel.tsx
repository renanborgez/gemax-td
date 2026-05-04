import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useHudStore } from '@/ui/hudStore';
import type { World } from '@/world/World';
import type { TargetPriority } from '@/entities/Tower';
import { getTowerDef } from '@/entities/registry';
import type { TowerKind } from '@/content/types';

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
      <Text style={styles.title}>{def.displayName} L{t.level}</Text>
      <View style={styles.row}>
        {PRIORITIES.map((p) => (
          <Pressable
            key={p}
            onPress={() => onPriority(p)}
            style={[styles.pill, t.targetPriority === p && styles.pillActive]}
          >
            <Text style={[styles.pillText, t.targetPriority === p && styles.pillTextActive]}>
              {p[0]!.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.actions}>
        {upgradeCost != null && (
          <Pressable onPress={onUpgrade} style={styles.action}>
            <Text style={styles.actionText}>UPGRADE {upgradeCost} ¢</Text>
          </Pressable>
        )}
        <Pressable onPress={onSell} style={[styles.action, styles.sell]}>
          <Text style={styles.actionText}>SELL</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', right: 8, top: 64, padding: 8, borderColor: '#00F0FF', borderWidth: 1, backgroundColor: '#0A0E1AEE', gap: 6, minWidth: 140 },
  title: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 13 },
  row: { flexDirection: 'row', gap: 4 },
  pill: { paddingVertical: 4, paddingHorizontal: 6, borderColor: '#00F0FF44', borderWidth: 1 },
  pillActive: { borderColor: '#FFB347' },
  pillText: { color: '#00F0FF88', fontFamily: 'monospace', fontSize: 12 },
  pillTextActive: { color: '#FFB347' },
  actions: { flexDirection: 'column', gap: 4 },
  action: { paddingVertical: 6, alignItems: 'center', borderColor: '#7CFF6B', borderWidth: 1 },
  sell: { borderColor: '#FF2BD6' },
  actionText: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 11 },
});
