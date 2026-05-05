import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TitleScreen } from '@/app/screens/TitleScreen';
import { LevelSelectScreen } from '@/app/screens/LevelSelectScreen';
import { TechTreeScreen } from '@/app/screens/TechTreeScreen';
import { PlayScreen } from '@/app/screens/PlayScreen';
import { SettingsScreen } from '@/app/screens/SettingsScreen';
import { WinScreen } from '@/app/screens/WinScreen';
import { LoseScreen } from '@/app/screens/LoseScreen';
import { PersistentTabBar } from '@/ui/components/PersistentTabBar';
import { useAudio } from '@/app/providers/AudioProvider';
import type { Difficulty } from '@/content/types';
import { COLORS, FONTS } from '@/render/theme';

export type RootStackParamList = {
  Title: undefined;
  LevelSelect: undefined;
  TechTree: undefined;
  Settings: undefined;
  Play: { levelId: string; difficulty: Difficulty };
  Win: { levelId: string; difficulty: Difficulty; stars: 0 | 1 | 2 | 3; shards: number; totalWaves: number };
  Lose: { levelId: string; difficulty: Difficulty; wavesCleared: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNav() {
  const navRef = useNavigationContainerRef<RootStackParamList>();
  const [routeName, setRouteName] = useState<string | undefined>(undefined);
  const audio = useAudio();

  useEffect(() => {
    if (routeName === undefined) return;
    void audio.playMusic(routeName === 'Play' ? 'in-game' : 'main-menu');
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
          <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg } }}>
            <Stack.Screen name="Title" component={TitleScreen} />
            <Stack.Screen name="LevelSelect" component={LevelSelectScreen} />
            <Stack.Screen name="TechTree" component={TechTreeScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Play" component={PlayScreen} />
            <Stack.Screen name="Win" component={WinScreen} />
            <Stack.Screen name="Lose" component={LoseScreen} />
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
