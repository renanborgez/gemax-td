import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { useSave } from '@/app/providers/SaveProvider';
import { TECH_NODES } from '@/content/techNodes';
import { isUnlockable, unlock } from '@/meta/TechTree';
import { ScreenShell } from '@/ui/components/ScreenShell';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TechTree'>;

export function TechTreeScreen({ navigation }: Props) {
  const { data, store, refresh } = useSave();

  const onUnlock = (nodeId: string) => {
    const node = TECH_NODES.find((n) => n.id === nodeId);
    if (!node) return;
    const r = isUnlockable(node, data);
    if (!r.ok) return;
    store.update((d) => unlock(node, d));
    refresh();
  };

  return (
    <ScreenShell
      sectionTitle="Tech Tree"
      onBack={() => navigation.goBack()}
    >
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>UPGRADES</Text>
        <View style={styles.shardPill}>
          <Text style={styles.shardText}>{data.meta.shards} ◆</Text>
        </View>
      </View>

      {TECH_NODES.map((node) => {
        const tier = data.meta.techTree[node.id] ?? 0;
        const status = isUnlockable(node, data);
        const isUnlocked = tier > 0;
        const accent = isUnlocked ? COLORS.secondary : COLORS.primary;
        return (
          <View key={node.id} style={styles.card}>
            <View style={[styles.accent, { backgroundColor: accent }]} />
            <View style={styles.cardBody}>
              <View style={styles.row}>
                <Text style={styles.name}>{node.displayName}</Text>
                <Text style={[styles.tier, isUnlocked && styles.tierUnlocked]}>
                  {isUnlocked ? 'INSTALLED' : `${node.cost} ◆`}
                </Text>
              </View>
              <Text style={styles.desc}>{node.description}</Text>
              {!isUnlocked && (
                <Pressable
                  disabled={!status.ok}
                  style={[styles.unlock, !status.ok && styles.unlockDisabled]}
                  onPress={() => onUnlock(node.id)}
                >
                  <Text style={[styles.unlockText, !status.ok && styles.unlockTextDisabled]}>
                    {status.ok ? 'INSTALL' : status.reason}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: { ...TEXT.label, color: COLORS.textMuted, fontSize: 11 },
  shardPill: {
    paddingVertical: 4,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.tertiarySoft,
  },
  shardText: { ...TEXT.buttonSmall, color: COLORS.tertiary },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  accent: { width: 3, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: SPACING.md, gap: SPACING.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...TEXT.title, fontSize: 14 },
  tier: { ...TEXT.buttonSmall, color: COLORS.tertiary },
  tierUnlocked: { color: COLORS.secondary },
  desc: { ...TEXT.bodySmall },
  unlock: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.xs,
  },
  unlockDisabled: { backgroundColor: COLORS.bgElevated },
  unlockText: { ...TEXT.button, color: COLORS.textOnAccent },
  unlockTextDisabled: { color: COLORS.textMuted },
});
