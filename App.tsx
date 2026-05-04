import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts as useSpaceGrotesk,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  useFonts as useEpilogue,
  Epilogue_400Regular,
  Epilogue_500Medium,
} from '@expo-google-fonts/epilogue';
import { bootstrap } from '@/app/bootstrap';
import { SaveProvider } from '@/app/providers/SaveProvider';
import { AudioProvider } from '@/app/providers/AudioProvider';
import { RootNav } from '@/app/RootNav';
import { COLORS } from '@/render/theme';

export default function App() {
  useEffect(() => { bootstrap(); }, []);

  const [grotesk] = useSpaceGrotesk({ SpaceGrotesk_500Medium, SpaceGrotesk_700Bold });
  const [epilogue] = useEpilogue({ Epilogue_400Regular, Epilogue_500Medium });
  const fontsReady = grotesk && epilogue;

  if (!fontsReady) {
    return <View style={{ flex: 1, backgroundColor: COLORS.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SaveProvider>
          <AudioProvider>
            <RootNav />
            <StatusBar style="light" />
          </AudioProvider>
        </SaveProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
