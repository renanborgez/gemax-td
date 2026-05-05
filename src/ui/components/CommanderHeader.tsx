import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TEXT, SPACING, RADIUS } from '@/render/theme';

export function CommanderHeader({
  sectionTitle,
  onBack,
}: {
  sectionTitle: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={18} color={COLORS.textPrimary} />
          </Pressable>
        ) : (
          <Ionicons name="phone-portrait-outline" size={16} color={COLORS.textMuted} />
        )}
        <Text style={styles.section}>{sectionTitle}</Text>
        <View style={{ flex: 1 }} />
      </View>
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, gap: SPACING.md },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  backBtn: {
    width: 28, height: 28, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center',
  },
  section: { ...TEXT.body, fontSize: 14, color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: COLORS.border, marginTop: SPACING.xs },
});
