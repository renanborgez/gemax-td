import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { bootstrap } from '@/app/bootstrap';
import { SaveProvider } from '@/app/providers/SaveProvider';
import { AudioProvider } from '@/app/providers/AudioProvider';
import { RootNav } from '@/app/RootNav';

export default function App() {
  useEffect(() => { bootstrap(); }, []);
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
