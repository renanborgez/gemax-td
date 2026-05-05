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
}: {
  active: TabKey;
  onSelect: (k: TabKey) => void;
}) {
  return (
    <View style={styles.root}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            style={[styles.tab, isActive && styles.tabActive]}
            hitSlop={8}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={isActive ? COLORS.primary : COLORS.textMuted}
            />
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
});
