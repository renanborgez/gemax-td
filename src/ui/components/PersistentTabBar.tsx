import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '@/app/RootNav';
import { BottomTabBar, type TabKey } from '@/ui/components/BottomTabBar';
import { COLORS } from '@/render/theme';

/**
 * Bottom tab bar rendered once at the navigator root so it stays put across
 * stack transitions. Driven by a NavigationContainer ref + the route name
 * lifted into RootNav (since useNavigation/useNavigationState only work
 * inside screens, not as siblings of the navigator).
 */
export function PersistentTabBar({
  routeName,
  navRef,
}: {
  routeName: string | undefined;
  navRef: NavigationContainerRef<RootStackParamList>;
}) {
  if (!routeName || routeName === 'Play') return null;

  const activeTab: TabKey =
    routeName === 'TechTree' ? 'towers' :
    routeName === 'Settings' ? 'settings' :
    'battle';

  const onSelect = (k: TabKey) => {
    if (!navRef.isReady()) return;
    if (k === 'battle') navRef.navigate('Title');
    else if (k === 'towers') navRef.navigate('TechTree');
    else if (k === 'settings') navRef.navigate('Settings');
    // market: not yet implemented
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.wrap}>
      <BottomTabBar active={activeTab} onSelect={onSelect} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: COLORS.bg },
});
