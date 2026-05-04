import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { useSave } from '@/app/providers/SaveProvider';
import { TECH_NODES } from '@/content/techNodes';
import { isUnlockable, unlock } from '@/meta/TechTree';

type Props = NativeStackScreenProps<RootStackParamList, 'TechTree'>;

export function TechTreeScreen(_: Props) {
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
    <ScrollView contentContainerStyle={styles.root}>
      <Text style={styles.heading}>UPGRADES · {data.meta.shards} SHARDS</Text>
      {TECH_NODES.map((node) => {
        const tier = data.meta.techTree[node.id] ?? 0;
        const status = isUnlockable(node, data);
        return (
          <View key={node.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{node.displayName}</Text>
              <Text style={[styles.tier, tier > 0 && styles.tierUnlocked]}>{tier > 0 ? 'UNLOCKED' : `${node.cost} ◆`}</Text>
            </View>
            <Text style={styles.desc}>{node.description}</Text>
            {tier === 0 && (
              <Pressable
                disabled={!status.ok}
                style={[styles.unlock, !status.ok && styles.unlockDisabled]}
                onPress={() => onUnlock(node.id)}
              >
                <Text style={styles.unlockText}>{status.ok ? 'INSTALL' : status.reason}</Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, gap: 12, backgroundColor: '#0A0E1A' },
  heading: { color: '#00F0FF', fontFamily: 'monospace', fontSize: 16, marginTop: 32, marginBottom: 16 },
  card: { padding: 12, borderColor: '#00F0FF66', borderWidth: 1, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 14 },
  tier: { color: '#FFB347', fontFamily: 'monospace', fontSize: 12 },
  tierUnlocked: { color: '#7CFF6B' },
  desc: { color: '#A8B5C5', fontSize: 12, fontFamily: 'monospace' },
  unlock: { paddingVertical: 8, alignItems: 'center', borderColor: '#00F0FF', borderWidth: 1 },
  unlockDisabled: { opacity: 0.4 },
  unlockText: { color: '#00F0FF', fontFamily: 'monospace', fontSize: 12 },
});
