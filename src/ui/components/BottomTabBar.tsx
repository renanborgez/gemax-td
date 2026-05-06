import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TEXT, SPACING, RADIUS } from '@/render/theme';

export type TabKey = 'battle' | 'towers' | 'market' | 'settings';

type TabDef = {
  key: TabKey;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

const TABS: readonly TabDef[] = [
  { key: 'battle', label: 'BATTLE', icon: 'flash' },
  { key: 'towers', label: 'TOWERS', icon: 'rocket' },
  // { key: 'market', label: 'MARKET', icon: 'storefront' }, // hidden until implemented
  { key: 'settings', label: 'SETTINGS', icon: 'settings-outline' },
];

export function BottomTabBar({
  active,
  onSelect,
  badges,
}: {
  active: TabKey;
  onSelect: (k: TabKey) => void;
  badges?: Partial<Record<TabKey, boolean>>;
}) {
  return (
    <View style={styles.root}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const showBadge = badges?.[tab.key] === true;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            style={[styles.tab, isActive && styles.tabActive]}
            hitSlop={8}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={tab.icon}
                size={20}
                color={isActive ? COLORS.primary : COLORS.textMuted}
              />
              {showBadge && <View style={styles.badgeDot} />}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    gap: SPACING.xs,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    backgroundColor: COLORS.bg,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    gap: 4,
  },
  tabActive: {
    borderColor: COLORS.primary,
    borderWidth: 1,
    backgroundColor: COLORS.primarySoft,
  },
  label: { ...TEXT.labelSmall, color: COLORS.textMuted, fontSize: 10 },
  labelActive: { color: COLORS.primary },
  iconWrap: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  badgeDot: {
    position: 'absolute',
    top: -3,
    right: -5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.tertiary,
    borderWidth: 1.5,
    borderColor: COLORS.bg,
  },
});
