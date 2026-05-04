import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TEXT, SPACING, RADIUS } from '@/render/theme';

/**
 * Reward badge as seen in the LOOT ACQUIRED card: a tinted hex-ish icon tile
 * with a label/value column. Used for shard rewards, star rating, etc.
 */
export function LootBadge({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View style={styles.root}>
      <View style={[styles.iconTile, { backgroundColor: `${accent}1F`, borderColor: accent }]}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: accent }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgElevated,
  },
  iconTile: {
    width: 44, height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { ...TEXT.labelSmall, color: COLORS.textMuted },
  value: { ...TEXT.title, fontSize: 18, marginTop: 2 },
});
