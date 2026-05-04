import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TEXT, SPACING, RADIUS } from '@/render/theme';

/**
 * Two-line menu row (icon + heading + subheading) with a bright vertical
 * accent bar on the left edge. Matches the COLLECTION / SYSTEM SETTINGS rows
 * in the home-page mockup.
 */
export function MenuRow({
  icon,
  heading,
  sub,
  onPress,
  accent = COLORS.secondary,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  heading: string;
  sub: string;
  onPress: () => void;
  accent?: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.root}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.heading, { color: accent }]}>{heading}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingRight: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  accent: { width: 3, alignSelf: 'stretch', marginRight: SPACING.sm },
  iconWrap: { width: 28, alignItems: 'center' },
  heading: { ...TEXT.label, fontSize: 13, letterSpacing: 1 },
  sub: { ...TEXT.labelSmall, color: COLORS.textMuted, marginTop: 2 },
});
