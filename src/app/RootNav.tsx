import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TitleScreen } from '@/app/screens/TitleScreen';
import { ChaptersScreen } from '@/app/screens/ChaptersScreen';
import { LevelSelectScreen } from '@/app/screens/LevelSelectScreen';
import { BriefingScreen } from '@/app/screens/BriefingScreen';
import { TowersScreen } from '@/app/screens/TowersScreen';
import { PlayScreen } from '@/app/screens/PlayScreen';
import { SettingsScreen } from '@/app/screens/SettingsScreen';
import { WinScreen } from '@/app/screens/WinScreen';
import { LoseScreen } from '@/app/screens/LoseScreen';
import { ChapterClearedScreen } from '@/app/screens/ChapterClearedScreen';
import { PersistentTabBar } from '@/ui/components/PersistentTabBar';
import { useAudio } from '@/app/providers/AudioProvider';
import type { Difficulty } from '@/content/types';
import { COLORS, FONTS } from '@/render/theme';

export type RootStackParamList = {
  Title: undefined;
  Chapters: undefined;
  LevelSelect: { chapter: number };
  Briefing: { levelId: string; difficulty: Difficulty };
  Towers: undefined;
  Settings: undefined;
  Play: { levelId: string; difficulty: Difficulty };
  Win: { levelId: string; difficulty: Difficulty; stars: 0 | 1 | 2 | 3; shards: number; totalWaves: number };
  Lose: { levelId: string; difficulty: Difficulty; wavesCleared: number };
  ChapterCleared: { winParams: RootStackParamList['Win'] };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const NO_BACK_OPTIONS = { gestureEnabled: false } as const;

const NO_BACK_LISTENERS = {
  beforeRemove: (e: { data: { action: { type: string } }; preventDefault: () => void }) => {
    if (e.data.action.type === 'GO_BACK') e.preventDefault();
  },
};

export function RootNav() {
  const navRef = useNavigationContainerRef<RootStackParamList>();
  const [routeName, setRouteName] = useState<string | undefined>(undefined);
  const audio = useAudio();

  useEffect(() => {
    if (routeName === undefined) return;
    // Menus + Play (pre-wave) share the main-menu loop. PlayScreen swaps to
    // 'in-game' only while a wave is actively running.
    void audio.playMusic('main-menu');
  }, [routeName, audio]);

  return (
    <NavigationContainer
      ref={navRef}
      onReady={() => setRouteName(navRef.getCurrentRoute()?.name)}
      onStateChange={() => setRouteName(navRef.getCurrentRoute()?.name)}
      theme={{
        dark: true,
        colors: {
          primary: COLORS.primary,
          background: COLORS.bg,
          card: COLORS.bg,
          text: COLORS.textPrimary,
          border: COLORS.bg,
          notification: COLORS.danger,
        },
        fonts: {
          regular: { fontFamily: FONTS.body, fontWeight: '400' },
          medium: { fontFamily: FONTS.bodyMedium, fontWeight: '500' },
          bold: { fontFamily: FONTS.headline, fontWeight: '700' },
          heavy: { fontFamily: FONTS.headline, fontWeight: '900' },
        },
      }}
    >
      <View style={styles.root}>
        <View style={styles.stackWrap}>
          <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: COLORS.bg } }}>
            <Stack.Screen name="Title" component={TitleScreen} options={NO_BACK_OPTIONS} listeners={NO_BACK_LISTENERS} />
            <Stack.Screen name="Chapters" component={ChaptersScreen} />
            <Stack.Screen name="LevelSelect" component={LevelSelectScreen} />
            <Stack.Screen name="Briefing" component={BriefingScreen} />
            <Stack.Screen name="Towers" component={TowersScreen} options={NO_BACK_OPTIONS} listeners={NO_BACK_LISTENERS} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={NO_BACK_OPTIONS} listeners={NO_BACK_LISTENERS} />
            <Stack.Screen name="Play" component={PlayScreen} />
            <Stack.Screen name="Win" component={WinScreen} />
            <Stack.Screen name="Lose" component={LoseScreen} />
            <Stack.Screen name="ChapterCleared" component={ChapterClearedScreen} />
          </Stack.Navigator>
        </View>
        <PersistentTabBar routeName={routeName} navRef={navRef} />
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  stackWrap: { flex: 1 },
});
