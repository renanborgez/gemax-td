import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TEXT, SPACING, RADIUS } from '@/render/theme';

/**
 * Boxed section with a heading row, an optional trailing element, and a
 * hairline divider. Matches the LOOT ACQUIRED / LEVEL PROGRESS cards in the
 * Victory Results mockup.
 */
export function SectionCard({
  title,
  trailing,
  trailingIcon,
  children,
}: {
  title: string;
  trailing?: string;
  trailingIcon?: React.ComponentProps<typeof Ionicons>['name'];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerRight}>
          {trailing != null && <Text style={styles.trailing}>{trailing}</Text>}
          {trailingIcon != null && (
            <Ionicons name={trailingIcon} size={18} color={COLORS.textMuted} />
          )}
        </View>
      </View>
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <View style={styles.diamond} />
        <View style={styles.line} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.border,
    borderWidth: 1,
    gap: SPACING.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...TEXT.label, color: COLORS.textPrimary, letterSpacing: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  trailing: { ...TEXT.title, fontSize: 15, color: COLORS.textPrimary },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  line: { flex: 1, height: 1, backgroundColor: COLORS.border },
  diamond: {
    width: 8, height: 8,
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.border,
    borderWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
});
