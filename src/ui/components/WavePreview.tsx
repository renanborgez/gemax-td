import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useHudStore } from '@/ui/hudStore';
import type { World } from '@/world/World';

export function WavePreview({ worldRef }: { worldRef: { current: World } }) {
  const status = useHudStore((s) => s.waveStatus);
  const idx = useHudStore((s) => s.waveIndex);
  if (status === 'in-progress') return null;
  const w = worldRef.current;
  const next = w.level.waves[idx + 1];
  if (!next) return null;
  const summary = aggregate(next);
  return (
    <View style={styles.root}>
      <Text style={styles.heading}>NEXT WAVE</Text>
      {Object.entries(summary).map(([kind, count]) => (
        <Text key={kind} style={styles.line}>{kind}: {count}</Text>
      ))}
    </View>
  );
}

function aggregate(wave: World['level']['waves'][number]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of wave.groups) out[g.enemyKind] = (out[g.enemyKind] ?? 0) + g.count;
  return out;
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 8, top: 64, padding: 8, borderColor: '#FFB34788', borderWidth: 1, backgroundColor: '#0A0E1AEE' },
  heading: { color: '#FFB347', fontFamily: 'monospace', fontSize: 11 },
  line: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 11 },
});
