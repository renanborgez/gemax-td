import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ALL_TOWER_DEFS } from '@/content/towerDefs';
import { useHudStore } from '@/ui/hudStore';
import type { TowerKind } from '@/content/types';

export function HUDBottom({
  selected, onSelect,
}: { selected: TowerKind | null; onSelect: (k: TowerKind | null) => void }) {
  const credits = useHudStore((s) => s.credits);
  return (
    <View style={styles.root}>
      {ALL_TOWER_DEFS.map((def) => {
        const affordable = credits >= def.cost;
        const isSelected = selected === def.kind;
        return (
          <Pressable
            key={def.kind}
            onPress={() => onSelect(isSelected ? null : def.kind)}
            disabled={!affordable && !isSelected}
            style={[styles.cell, isSelected && styles.cellSelected, !affordable && styles.cellDisabled]}
          >
            <Text style={styles.name}>{def.displayName}</Text>
            <Text style={styles.cost}>{def.cost} ¢</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', padding: 8, gap: 6, backgroundColor: '#0A0E1ACC' },
  cell: { flex: 1, padding: 8, borderColor: '#00F0FF', borderWidth: 1, alignItems: 'center' },
  cellSelected: { backgroundColor: '#00F0FF22', borderColor: '#FFB347' },
  cellDisabled: { opacity: 0.4 },
  name: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 11 },
  cost: { color: '#FFB347', fontFamily: 'monospace', fontSize: 12 },
});
