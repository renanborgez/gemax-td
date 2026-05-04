import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GridBackground } from '@/ui/components/GridBackground';
import { CommanderHeader } from '@/ui/components/CommanderHeader';
import { COLORS, SPACING } from '@/render/theme';

/**
 * Standard menu-screen layout: dot-grid backdrop, commander header, and
 * scrollable content. The bottom tab bar is rendered persistently at the
 * navigator root (see PersistentTabBar) so it doesn't swipe with screens.
 */
export function ScreenShell({
  sectionTitle,
  onBack,
  scroll = true,
  children,
}: {
  sectionTitle: string;
  onBack?: () => void;
  scroll?: boolean;
  children: React.ReactNode;
}) {
  const content = scroll ? (
    <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={styles.contentFlex}>{children}</View>
  );

  return (
    <View style={styles.root}>
      <GridBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <CommanderHeader sectionTitle={sectionTitle} {...(onBack !== undefined ? { onBack } : {})} />
        <View style={styles.body}>{content}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
  body: { flex: 1 },
  contentScroll: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  contentFlex: { flex: 1, padding: SPACING.lg, gap: SPACING.lg },
});
