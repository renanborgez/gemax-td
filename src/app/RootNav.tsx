import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TitleScreen } from '@/app/screens/TitleScreen';
import { LevelSelectScreen } from '@/app/screens/LevelSelectScreen';
import { TechTreeScreen } from '@/app/screens/TechTreeScreen';
import { PlayScreen } from '@/app/screens/PlayScreen';
import type { Difficulty } from '@/content/types';

export type RootStackParamList = {
  Title: undefined;
  LevelSelect: undefined;
  TechTree: undefined;
  Play: { levelId: string; difficulty: Difficulty };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNav() {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: '#00F0FF', background: '#0A0E1A',
          card: '#0A0E1A', text: '#E8F1FF',
          border: '#0A0E1A', notification: '#FF2BD6',
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0E1A' } }}>
        <Stack.Screen name="Title" component={TitleScreen} />
        <Stack.Screen name="LevelSelect" component={LevelSelectScreen} />
        <Stack.Screen name="TechTree" component={TechTreeScreen} />
        <Stack.Screen name="Play" component={PlayScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
