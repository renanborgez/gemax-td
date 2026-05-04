import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TEXT, SPACING, RADIUS } from '@/render/theme';

/**
 * Top bar shown on every menu screen: small section title (e.g. "Main Menu"),
 * the commander's identity (avatar + handle + rank), and a hairline separator
 * matching the Cyber-Defense Logic mockup.
 */
export function CommanderHeader({
  sectionTitle,
  onBack,
  callsign = 'COMMANDER-01',
  rank = 'RANK: ELITE DEFENDER',
}: {
  sectionTitle: string;
  onBack?: () => void;
  callsign?: string;
  rank?: string;
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

      <View style={styles.idRow}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color={COLORS.primary} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.callsign}>{callsign}</Text>
          <Text style={styles.rank}>{rank}</Text>
        </View>
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
  idRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatarRing: {
    width: 48, height: 48, borderRadius: 24,
    borderColor: COLORS.primary, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  callsign: { ...TEXT.headline, fontSize: 18, color: COLORS.primary, letterSpacing: 1 },
  rank: { ...TEXT.labelSmall, color: COLORS.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginTop: SPACING.xs },
});
