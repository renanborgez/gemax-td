import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/RootNav';

type Props = NativeStackScreenProps<RootStackParamList, 'Play'>;

export function PlayScreen({ route, navigation }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>PLAY · {route.params.levelId} · {route.params.difficulty}</Text>
      <Text style={styles.text}>(rendering wired in Phase E)</Text>
      <Pressable onPress={() => navigation.goBack()} style={styles.btn}>
        <Text style={styles.btnText}>BACK</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0E1A', gap: 12 },
  text: { color: '#E8F1FF', fontFamily: 'monospace' },
  btn: { paddingVertical: 8, paddingHorizontal: 16, borderColor: '#00F0FF', borderWidth: 1, marginTop: 24 },
  btnText: { color: '#00F0FF', fontFamily: 'monospace' },
});
