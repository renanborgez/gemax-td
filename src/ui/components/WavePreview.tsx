import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useHudStore } from '@/ui/hudStore';
import type { World } from '@/world/World';
import { COLORS, TEXT, RADIUS, SPACING } from '@/render/theme';

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
      <View style={styles.accent} />
      <View style={styles.content}>
        <Text style={styles.heading}>NEXT WAVE</Text>
        {Object.entries(summary).map(([kind, count]) => (
          <Text key={kind} style={styles.line}>{kind}: {count}</Text>
        ))}
      </View>
    </View>
  );
}

function aggregate(wave: World['level']['waves'][number]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of wave.groups) out[g.enemyKind] = (out[g.enemyKind] ?? 0) + g.count;
  return out;
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: SPACING.sm,
    top: SPACING.sm,
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard,
    overflow: 'hidden',
  },
  accent: { width: 3, backgroundColor: COLORS.tertiary },
  content: { padding: SPACING.sm, gap: 2 },
  heading: { ...TEXT.labelSmall, color: COLORS.tertiary },
  line: { ...TEXT.bodySmall, color: COLORS.textPrimary, fontSize: 11 },
});
