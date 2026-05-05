import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';
import { getEnemyDef } from '@/entities/registry';
import type { EnemyKind, WaveDef } from '@/content/types';

const ENEMY_BLURB: Record<EnemyKind, string> = {
  worm: 'Fast, fragile crawler. Arrives in swarms — splash damage shines here.',
  trojan: 'Mid-tier carrier with light armor. Trades speed for durability.',
  daemon: 'Heavy ground unit. High HP and armor — pierce or focus fire.',
  rootkit: 'Boss-class threat. Massive HP pool; expect to commit your full grid.',
};

export function NextWaveModal({
  visible, wave, waveNumber, onDismiss,
}: {
  visible: boolean;
  wave: WaveDef | null;
  waveNumber: number;
  onDismiss: () => void;
}) {
  const groups = wave ? aggregate(wave) : null;
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.bg} onPress={onDismiss}>
        <Pressable onPress={() => {}} style={styles.card}>
          <Text style={styles.title}>WAVE {waveNumber} INCOMING</Text>
          {!groups || Object.keys(groups).length === 0 ? (
            <Text style={styles.empty}>No further waves queued.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: SPACING.sm }}>
              {Object.entries(groups).map(([kind, count]) => {
                const def = getEnemyDef(kind as EnemyKind);
                return (
                  <View key={kind} style={styles.row}>
                    <View style={styles.rowHead}>
                      <Text style={styles.name}>{def.displayName}</Text>
                      <Text style={styles.count}>×{count}</Text>
                    </View>
                    <Text style={styles.blurb}>{ENEMY_BLURB[kind as EnemyKind]}</Text>
                    <View style={styles.statRow}>
                      <Stat label="HP" value={String(def.baseStats.hp)} />
                      <Stat label="SPD" value={def.baseStats.speed.toFixed(1)} />
                      <Stat label="ARM" value={String(def.baseStats.armor)} />
                      <Stat label="BOUNTY" value={String(def.bounty)} />
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
          <Pressable onPress={onDismiss} style={styles.btn}>
            <Text style={styles.btnText}>CLOSE</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function aggregate(wave: WaveDef): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of wave.groups) out[g.enemyKind] = (out[g.enemyKind] ?? 0) + g.count;
  return out;
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000DD', padding: SPACING.lg },
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    gap: SPACING.md,
    minWidth: 280,
    maxWidth: 420,
    width: '100%',
    backgroundColor: COLORS.bgCard,
  },
  title: { ...TEXT.title, color: COLORS.tertiary, textAlign: 'center' },
  empty: { ...TEXT.body, color: COLORS.textMuted, textAlign: 'center' },
  row: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgElevated,
    gap: SPACING.xs,
  },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  name: { ...TEXT.title, fontSize: 16, color: COLORS.textPrimary },
  count: { ...TEXT.hudValue, color: COLORS.tertiary },
  blurb: { ...TEXT.bodySmall, color: COLORS.textMuted },
  statRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xs },
  stat: { alignItems: 'flex-start' },
  statLabel: { ...TEXT.labelSmall },
  statValue: { ...TEXT.body, color: COLORS.textPrimary },
  btn: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgElevated,
  },
  btnText: { ...TEXT.button, color: COLORS.textPrimary },
});
