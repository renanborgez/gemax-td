import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';
import { SettingsModal } from '@/ui/modals/SettingsModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Title'>;

export function TitleScreen({ navigation }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <View style={styles.root}>
      <Text style={styles.title}>tower-gemax</Text>
      <Text style={styles.subtitle}>netrunner online</Text>
      <Pressable style={styles.btn} onPress={() => navigation.navigate('LevelSelect')}>
        <Text style={styles.btnText}>Run</Text>
      </Pressable>
      <Pressable style={styles.btn} onPress={() => navigation.navigate('TechTree')}>
        <Text style={styles.btnText}>Tech Tree</Text>
      </Pressable>
      <Pressable style={styles.btn} onPress={() => setSettingsOpen(true)}>
        <Text style={styles.btnText}>Settings</Text>
      </Pressable>
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0E1A', gap: 16 },
  title: { color: '#00F0FF', fontFamily: 'monospace', fontSize: 32, letterSpacing: 2 },
  subtitle: { color: '#FF2BD6', fontFamily: 'monospace', fontSize: 14, marginBottom: 32 },
  btn: { paddingVertical: 12, paddingHorizontal: 32, borderColor: '#00F0FF', borderWidth: 1 },
  btnText: { color: '#E8F1FF', fontFamily: 'monospace', fontSize: 16 },
});
